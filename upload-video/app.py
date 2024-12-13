import time
from flask import Flask, request, jsonify
from flask_cors import CORS, cross_origin
import cv2
import os
import threading
from ultralytics import YOLO
import logging
import torch
import redis
import json

logging.getLogger("ultralytics").setLevel(logging.WARNING)
print(f"Cuda available: {torch.cuda.is_available()}")  # Debe retornar True si hay una GPU.

# Configuración de Flask
app = Flask(__name__)
CORS(app)

# Configuración de directorios
VIDEO_DIR = "videos/"
IMAGE_DIR = "imagenes/"
os.makedirs(VIDEO_DIR, exist_ok=True)
os.makedirs(IMAGE_DIR, exist_ok=True)

# Conexión a Redis alojado en Redis Cloud
redis_client = redis.StrictRedis(
    host='redis-18936.c274.us-east-1-3.ec2.redns.redis-cloud.com',
    port=18936,
    password='UTCq3LmjUHjqmEmmM4fe6UMkYBze3U2L',
    decode_responses=True  # Decodifica las respuestas para facilitar su uso
)

# Cargar modelo YOLOv8
model = YOLO("yolov8n.pt", verbose=False)
device = "cuda" if torch.cuda.is_available() else "cpu"
print(f"device used {device}")

@app.route('/upload', methods=["POST"])
@cross_origin()
def upload_video():
    if 'video' not in request.files:
        msj = {"error": "No video file provided"}
        response = jsonify(msj)
        response.status_code = 400
        return response

    file = request.files['video']
    filename = file.filename
    print(f"Guardando video {filename}")
    file_path = os.path.join(VIDEO_DIR, filename)
    file.save(file_path)
    print(f"Video {filename} guardado")

    # Inicia el procesamiento del video en segundo plano
    threading.Thread(target=process_video, args=(filename,)).start()

    msj = {"message": "Video uploaded successfully", "filename": filename}
    response = jsonify(msj)
    response.status_code = 201
    return response

def process_video(filename):
    file_path = os.path.join(VIDEO_DIR, filename)

    # Procesar el video con OpenCV
    cap = cv2.VideoCapture(file_path)
    cap.set(cv2.CAP_PROP_FPS, 15)               # Reducir FPS si no necesitas tiempo real completo
    cap.set(cv2.CAP_PROP_FRAME_WIDTH, 640)      # Cambiar a resoluciones más bajas
    cap.set(cv2.CAP_PROP_FRAME_HEIGHT, 480)
    fps = cap.get(cv2.CAP_PROP_FPS)
    frame_count = 0
    interval = 3  # Procesar un frame cada 3
    print(f"Guardando frames {filename}")
    try:
        while cap.isOpened():
            ret, frame = cap.read()
            if not ret:
                print("Frame no leído -> exit")
                break

            frame_count += 1
            if frame_count % interval == 0:
                # Momento actual del frame en segundos
                frame_time = frame_count / fps

                # Detección de objetos con YOLOv8
                processed_frame, metadata = detect_objects_with_metadata(frame, frame_time, frame_count)

                # Guardar el frame procesado como imagen
                image_path = os.path.join(IMAGE_DIR, f"{filename}frame_{frame_count}.jpg")
                cv2.imwrite(image_path, processed_frame)

                # Agregar ruta de la imagen a la metadata
                metadata["image_path"] = image_path
                metadata["video_name"] = filename

                # Guardar metadata en formato JSON en Redis
                redis_key = f"video:{filename}:frame:{frame_count}"
                redis_client.execute_command('JSON.SET', redis_key, '.', json.dumps(metadata))

                # print(f"Metadata guardada en Redis: {redis_key}")

    except Exception as e:
        print(f"Error durante el análisis: {e}")
    finally:
        cap.release()
        print(f"Análisis del video {filename} finalizado")

def detect_objects_with_metadata(frame, frame_time, frame_count):
    # Detectar objetos en el frame usando YOLOv8
    results = model.predict(source=frame, save=False, save_txt=False, conf=0.25, device=device, stream=True)
    metadata = {
        "frame_index": frame_count,
        "frame_time": frame_time,
        "detections": []
    }

    for result in results:
        for box in result.boxes:
            x1, y1, x2, y2 = map(int, box.xyxy[0].tolist())  # Coordenadas del bounding box
            confidence = float(box.conf[0])  # Confianza
            class_id = int(box.cls[0])  # Clase detectada
            label = model.names[class_id]

            # Agregar detección al metadata
            metadata["detections"].append({
                "class_id": class_id,
                "label": label,
                "confidence": confidence,
                "bounding_box": {"x1": x1, "y1": y1, "x2": x2, "y2": y2}
            })

            # Dibujar el bounding box en el frame
            cv2.rectangle(frame, (x1, y1), (x2, y2), (0, 255, 0), 2)
            cv2.putText(frame, f"{label}: {confidence:.2f}", (x1, y1 - 10), cv2.FONT_HERSHEY_SIMPLEX, 0.5, (0, 255, 0), 2)

    return frame, metadata

# if __name__ == '__main__':
#     app.run(host="0.0.0.0", port=5002, debug=True)
