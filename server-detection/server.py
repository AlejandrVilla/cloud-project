import time
from flask import Flask, request, jsonify
from flask_socketio import SocketIO, emit
from flask_cors import CORS, cross_origin
import cv2
import os
from ultralytics import YOLO
import threading
import logging
logging.getLogger("ultralytics").setLevel(logging.WARNING)

app = Flask(__name__)
CORS(app)

socketio = SocketIO(
    app, 
    cors_allowed_origins="*",
    async_mode="gevent"
)

VIDEO_DIR = "videos/"
os.makedirs(VIDEO_DIR, exist_ok=True)

# Cargar modelo YOLOv8
model = YOLO("yolov8n.pt", verbose=False)

# Diccionario para rastrear el estado de conexión de los clientes
client_connections = {}

@app.route('/upload', methods=['POST'])
@cross_origin()
def upload_video():
    if 'video' not in request.files:
        msj = {
            "error": "No video file provided"
        }
        response = jsonify(msj)
        response.status_code = 400
        return response
    file = request.files['video']
    filename = file.filename
    file_path = os.path.join(VIDEO_DIR, filename)
    file.save(file_path)

    msj = {
        "message": "Video uploaded successfully", 
        "filename": filename
    }
    response = jsonify(msj)
    response.status_code = 201
    return response

@app.route('/videos', methods=['GET'])
def list_videos():
    # Lista los videos disponibles
    videos = os.listdir(VIDEO_DIR)
    return jsonify(videos)

@socketio.on("connect")
def handle_connect():
    client_connections[request.sid] = True
    print(f"user {request.sid} connected")
    emit("succes_connect", {"id": f"{request.sid}"})

@socketio.on("disconnect")
def handle_disconnect():
    client_connections[request.sid] = False
    print(f"user {request.sid} disconnected")
    emit("disconnect", {"id": f"{request.sid}"})

@socketio.on('process_video')
def process_video(data):
    filename = data['filename']
    file_path = os.path.join(VIDEO_DIR, filename)

    if not os.path.exists(file_path):
        socketio.emit('error', {"message": "Video not found"})
        return

    print(f"Transmitiendo {filename}")
    # Procesar el video con OpenCV
    cap = cv2.VideoCapture(file_path)
    try:
        while cap.isOpened():
            # Verificar si el cliente aún está conectado
            if not client_connections.get(request.sid, False):
                print(f"Transmisión cancelada para el cliente {request.sid}")
                break

            ret, frame = cap.read()
            if not ret:
                break

            # Detección de objetos con YOLOv8
            processed_frame = detect_objects(frame)

            # Convertir frame para envío
            _, buffer = cv2.imencode('.jpg', processed_frame)
            frame_data = buffer.tobytes()
            socketio.emit('frame', frame_data, to=request.sid)
            time.sleep(0.03)  # Controlar la tasa de envío de frames

    except Exception as e:
        print(f"Error durante la transmisión: {e}")
    finally:
        cap.release()
        socketio.emit('end_of_video', to=request.sid)
        print(f"Transmisión finalizada para el cliente {request.sid}")

def detect_objects(frame):
    # Detectar objetos en el frame usando YOLOv8
    results = model.predict(source=frame, save=False, save_txt=False, conf=0.25, device="cpu", stream=True)
    for result in results:
        for box in result.boxes:
            x1, y1, x2, y2 = map(int, box.xyxy[0].tolist())  # Coordenadas del bounding box
            confidence = box.conf[0]  # Confianza
            class_id = int(box.cls[0])  # Clase detectada

            # Dibujar el bounding box en el frame
            cv2.rectangle(frame, (x1, y1), (x2, y2), (0, 255, 0), 2)
            label = f"{model.names[class_id]}: {confidence:.2f}"
            cv2.putText(frame, label, (x1, y1 - 10), cv2.FONT_HERSHEY_SIMPLEX, 0.5, (0, 255, 0), 2)

    return frame

if __name__ == '__main__':
    socketio.run(app, debug=True, host="127.0.0.1", port=5000)