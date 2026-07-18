import cv2
import numpy as np
import os
import logging
from PIL import Image
import urllib.request
from typing import Tuple, List, Dict

logger = logging.getLogger("smartclass_backend")

class FaceService:
    def __init__(self, models_dir: str = "models_cache"):
        self.models_dir = models_dir
        os.makedirs(self.models_dir, exist_ok=True)
        
        # Load OpenCV Haar Cascade for face detection
        cascade_path = cv2.data.haarcascades + 'haarcascade_frontalface_default.xml'
        self.face_cascade = cv2.CascadeClassifier(cascade_path)
        if self.face_cascade.empty():
            logger.error("Failed to load Haar Cascade face detector.")
            
        self.onnx_session = None
        self.embedding_model_loaded = False
        self._init_embedding_model()

    def _init_embedding_model(self):
        """Initialize the ONNX Face Embedding model (ArcFace/MobileFaceNet)."""
        try:
            import onnxruntime as ort
            # We will attempt to load a pre-trained face embedding model.
            # For robustness, we specify a local path.
            model_path = os.path.join(self.models_dir, "mobilefacenet.onnx")
            
            # If the model doesn't exist, we can download a lightweight MobileFaceNet (approx 4MB)
            if not os.path.exists(model_path):
                logger.info("Downloading lightweight MobileFaceNet ONNX model...")
                url = "https://github.com/onnx/models/raw/main/validated/vision/body_analysis/arcface/model/arcfaceresnet100-8.onnx" # High quality ArcFace
                # Let's use a smaller, faster model if possible, or attempt downloading ArcFace.
                # To ensure instant startup, we check if we can download it.
                # If offline, we will gracefully degrade.
                try:
                    # Let's download a small MobileFaceNet instead (much faster)
                    small_model_url = "https://github.com/gnh1201/mobilefacenet-onnx/raw/master/model/mobilefacenet.onnx"
                    urllib.request.urlretrieve(small_model_url, model_path)
                    logger.info("Successfully downloaded MobileFaceNet ONNX model.")
                except Exception as e:
                    logger.warning(f"Could not download embedding model: {e}. Fallback to dummy embeddings will be active.")
            
            if os.path.exists(model_path):
                # Use CPU execution provider by default
                self.onnx_session = ort.InferenceSession(model_path, providers=['CPUExecutionProvider'])
                self.embedding_model_loaded = True
                logger.info("Loaded ONNX Face Embedding model successfully.")
        except Exception as e:
            logger.error(f"Error initializing face embedding model: {e}")
            self.embedding_model_loaded = False

    def validate_frame(self, image_bytes: bytes) -> Tuple[bool, str, Dict]:
        """
        Validates frame quality:
        - Exactly one face
        - Brightness is acceptable
        - Image is sharp (not blurry)
        - Face is large enough in the frame
        - Face is fully inside the frame
        """
        # Decode image
        nparr = np.frombuffer(image_bytes, np.uint8)
        img = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
        if img is None:
            return False, "Invalid image format", {}

        h, w, _ = img.shape
        gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)

        # 1. Check lighting (brightness)
        mean_brightness = gray.mean()
        if mean_brightness < 40:
            return False, "Lighting too dark. Turn on more lights.", {}
        if mean_brightness > 245:
            return False, "Lighting too bright. Avoid direct exposure.", {}

        # 2. Detect face
        faces = self.face_cascade.detectMultiScale(
            gray, 
            scaleFactor=1.1, 
            minNeighbors=5, 
            minSize=(60, 60)
        )

        if len(faces) == 0:
            return False, "No face detected. Look at the camera.", {}
        if len(faces) > 1:
            return False, "Multiple faces detected. Only one student should be in frame.", {}

        (x, y, fw, fh) = faces[0]

        # 3. Check if face is fully in the frame
        # Keep a 10px safety margin
        margin = 10
        if x < margin or y < margin or (x + fw) > (w - margin) or (y + fh) > (h - margin):
            return False, "Face is outside the frame. Center yourself.", {}

        # 4. Check if face is too small (move closer)
        # Face area should be at least 10% of image area
        face_area_ratio = (fw * fh) / (w * h)
        if face_area_ratio < 0.08:
            return False, "Too far from camera. Move closer.", {}

        # 5. Check blurriness
        # Laplacian variance
        blur_val = cv2.Laplacian(gray, cv2.CV_64F).var()
        if blur_val < 35.0:
            return False, "Image is blurry. Hold still.", {}

        # All checks passed!
        face_box = {
            "x": int(x),
            "y": int(y),
            "w": int(fw),
            "h": int(fh),
            "img_w": w,
            "img_h": h
        }
        return True, "Success", face_box

    def crop_and_align(self, image_path: str) -> np.ndarray:
        """Loads an image, detects the face, crops and resizes it (aligns to 112x112)."""
        img = cv2.imread(image_path)
        if img is None:
            raise ValueError(f"Could not load image: {image_path}")

        gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
        faces = self.face_cascade.detectMultiScale(gray, 1.1, 5, minSize=(60, 60))
        
        if len(faces) == 0:
            # Fallback to center crop if face detection fails during post-processing
            h, w = img.shape[:2]
            size = min(h, w)
            x, y = (w - size) // 2, (h - size) // 2
            cropped = img[y:y+size, x:x+size]
        else:
            x, y, w, h = faces[0]
            # Add a slight padding to crop
            pad_x = int(w * 0.1)
            pad_y = int(h * 0.1)
            img_h, img_w = img.shape[:2]
            
            x1 = max(0, x - pad_x)
            y1 = max(0, y - pad_y)
            x2 = min(img_w, x + w + pad_x)
            y2 = min(img_h, y + h + pad_y)
            
            cropped = img[y1:y2, x1:x2]

        # Resize to standard size for ArcFace / MobileFaceNet (112x112)
        aligned = cv2.resize(cropped, (112, 112))
        return aligned

    def generate_embedding(self, face_img: np.ndarray) -> List[float]:
        """
        Generates face embeddings from a cropped, aligned face image (112x112).
        If the ONNX model is loaded, it extracts features.
        Otherwise, it falls back to a deterministic feature hashing embedding.
        """
        if self.embedding_model_loaded and self.onnx_session is not None:
            try:
                # Preprocess image for MobileFaceNet
                # Model expects NCHW, BGR or RGB, float32, normalized
                # MobileFaceNet typically expects normalized input: (img - 127.5) / 128
                input_img = face_img.astype(np.float32)
                input_img = (input_img - 127.5) / 128.0
                input_img = input_img.transpose(2, 0, 1)  # HWC to CHW
                input_img = np.expand_dims(input_img, axis=0)  # Add batch dim

                input_name = self.onnx_session.get_inputs()[0].name
                output_name = self.onnx_session.get_outputs()[0].name
                
                embeddings = self.onnx_session.run([output_name], {input_name: input_img})[0]
                
                # Normalize embedding vector
                embedding = embeddings[0]
                norm = np.linalg.norm(embedding)
                if norm > 0:
                    embedding = embedding / norm
                    
                return embedding.tolist()
            except Exception as e:
                logger.error(f"Error during model inference: {e}. Falling back to visual fingerprint.")
        
        # Fallback implementation: Deterministic visual fingerprint from the image
        # This ensures the prototype works offline and runs successfully on all PCs.
        # We compute visual color statistics and DCT coefficients to get a 128-dimensional descriptor.
        try:
            gray = cv2.cvtColor(face_img, cv2.COLOR_BGR2GRAY)
            resized = cv2.resize(gray, (16, 16)) # 256 pixels
            
            # Use DCT (Discrete Cosine Transform) for frequency features
            dct = cv2.dct(resized.astype(np.float32))
            
            # Extract the lowest 128 coefficients (representing shape/structure)
            embedding = dct.flatten()[:128]
            
            # Normalize
            norm = np.linalg.norm(embedding)
            if norm > 0:
                embedding = embedding / norm
            return embedding.tolist()
        except Exception as e:
            logger.error(f"Fallback embedding generation failed: {e}")
            # Absolute fallback
            return [0.0] * 128

    def recognize_face(
        self,
        image_bytes: bytes,
        enrolled_students: list,
        threshold: float = 0.50
    ) -> dict:
        """
        Given a raw webcam image (bytes) and a list of enrolled student dicts
        (each having 'averageEmbedding'), find the best matching student.

        Returns:
          {
            'recognized': bool,
            'rollNumber': str | None,
            'student': dict | None,
            'confidence': float,
            'reason': str,
          }
        """
        # Step 1: Validate frame (face must be detected)
        valid, reason, face_box = self.validate_frame(image_bytes)
        if not valid:
            return {"recognized": False, "rollNumber": None, "student": None, "confidence": 0.0, "reason": reason}

        # Step 2: Decode image and crop/align the face
        try:
            import numpy as np
            nparr = np.frombuffer(image_bytes, np.uint8)
            import cv2
            img = cv2.imdecode(nparr, cv2.IMREAD_COLOR)

            x, y, fw, fh = face_box["x"], face_box["y"], face_box["w"], face_box["h"]
            # Add small padding
            img_h, img_w = img.shape[:2]
            pad = int(max(fw, fh) * 0.1)
            x1 = max(0, x - pad)
            y1 = max(0, y - pad)
            x2 = min(img_w, x + fw + pad)
            y2 = min(img_h, y + fh + pad)
            face_crop = img[y1:y2, x1:x2]
            aligned_face = cv2.resize(face_crop, (112, 112))
        except Exception as e:
            logger.error(f"Face crop failed: {e}")
            return {"recognized": False, "rollNumber": None, "student": None, "confidence": 0.0, "reason": "Face alignment failed"}

        # Step 3: Generate embedding for the input face
        query_embedding = self.generate_embedding(aligned_face)
        query_vec = np.array(query_embedding, dtype=np.float32)
        q_norm = np.linalg.norm(query_vec)
        if q_norm > 0:
            query_vec = query_vec / q_norm

        # Step 4: Compare against each enrolled student's averageEmbedding
        best_score = -1.0
        best_student = None

        for student in enrolled_students:
            avg_emb = student.get("averageEmbedding")
            if not avg_emb:
                continue
            db_vec = np.array(avg_emb, dtype=np.float32)
            db_norm = np.linalg.norm(db_vec)
            if db_norm > 0:
                db_vec = db_vec / db_norm

            # Cosine similarity
            score = float(np.dot(query_vec, db_vec))
            if score > best_score:
                best_score = score
                best_student = student

        if best_student is None or best_score < threshold:
            return {
                "recognized": False,
                "rollNumber": None,
                "student": None,
                "confidence": round(max(best_score, 0.0), 4),
                "reason": f"No confident match found (best score: {best_score:.2f})",
            }

        return {
            "recognized": True,
            "rollNumber": best_student["rollNumber"],
            "student": best_student,
            "confidence": round(best_score, 4),
            "reason": "Match found",
        }

    def recognize_multiple_faces(
        self,
        image_bytes: bytes,
        enrolled_students: list,
        threshold: float = 0.50
    ) -> list:
        """
        Detects all faces in the frame and attempts to recognize each one.
        """
        import numpy as np
        import cv2

        nparr = np.frombuffer(image_bytes, np.uint8)
        img = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
        if img is None:
            return []

        gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
        faces = self.face_cascade.detectMultiScale(
            gray, 
            scaleFactor=1.1, 
            minNeighbors=5, 
            minSize=(60, 60)
        )

        results = []
        img_h, img_w = img.shape[:2]

        for (x, y, fw, fh) in faces:
            try:
                # Crop & Align
                pad = int(max(fw, fh) * 0.1)
                x1 = max(0, x - pad)
                y1 = max(0, y - pad)
                x2 = min(img_w, x + fw + pad)
                y2 = min(img_h, y + fh + pad)
                face_crop = img[y1:y2, x1:x2]
                aligned_face = cv2.resize(face_crop, (112, 112))

                # Generate embedding
                query_embedding = self.generate_embedding(aligned_face)
                query_vec = np.array(query_embedding, dtype=np.float32)
                q_norm = np.linalg.norm(query_vec)
                if q_norm > 0:
                    query_vec = query_vec / q_norm

                # Match against database
                best_score = -1.0
                best_student = None

                for student in enrolled_students:
                    avg_emb = student.get("averageEmbedding")
                    if not avg_emb:
                        continue
                    db_vec = np.array(avg_emb, dtype=np.float32)
                    db_norm = np.linalg.norm(db_vec)
                    if db_norm > 0:
                        db_vec = db_vec / db_norm

                    score = float(np.dot(query_vec, db_vec))
                    if score > best_score:
                        best_score = score
                        best_student = student

                if best_student is None or best_score < threshold:
                    results.append({
                        "recognized": False,
                        "rollNumber": None,
                        "student": None,
                        "confidence": round(max(best_score, 0.0), 4),
                        "reason": f"Unknown face (best score: {best_score:.2f})",
                    })
                else:
                    results.append({
                        "recognized": True,
                        "rollNumber": best_student["rollNumber"],
                        "student": best_student,
                        "confidence": round(best_score, 4),
                        "reason": "Match found",
                    })
            except Exception as e:
                logger.error(f"Error processing a face in multiple detection: {e}")
                continue

        return results


# Global Face Service
face_service = FaceService()
