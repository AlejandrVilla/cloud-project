from flask import Flask, request, jsonify
from flask_socketio import SocketIO, emit
from flask_cors import CORS, cross_origin
import cv2
import os
import torch
import threading

app = Flask(__name__)
CORS(app)

socketio = SocketIO(
    app, 
    cors_allowed_origins="*",
    # async_mode="gevent"
)

VIDEO_DIR = "videos/"
os.makedirs(VIDEO_DIR, exist_ok=True)

# yolo11
model = torch.hub.load('ultralytics/yolov5', 'yolov5s')

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
    print(f"user {request.sid} connected")
    emit("succes_connect", {"id": f"{request.sid}"})

@socketio.on("disconnect")
def handle_disconnect():
    print(f"user {request.sid} disconnected")
    emit("disconnect", {"id": f"{request.sid}"})

@socketio.on('process_video')
def process_video(data):
    def process_video_thread(data):
        filename = data['filename']
        file_path = os.path.join(VIDEO_DIR, filename)

        if not os.path.exists(file_path):
            socketio.emit('error', {"message": "Video not found"})
            return

        # Procesar el video con OpenCV
        cap = cv2.VideoCapture(file_path)
        while cap.isOpened():
            ret, frame = cap.read()
            if not ret:
                break

            # Detección de objetos con YOLO
            processed_frame = detect_objects(frame)

            # Convertir frame para envío
            _, buffer = cv2.imencode('.jpg', processed_frame)
            frame_data = buffer.tobytes()

            # Emitir frame al cliente
            socketio.emit('frame', frame_data)

        cap.release()
        socketio.emit('end_of_video')

    # Inicia un hilo para procesar el video
    thread = threading.Thread(target=process_video_thread, args=(data,))
    thread.start()


def detect_objects(frame):
    # Detectar objetos en el frame usando YOLOv5
    results = model(frame)  # Realiza detección

    # Iterar sobre las detecciones
    for detection in results.xyxy[0]:  # Extraer detecciones del primer resultado
        x1, y1, x2, y2 = map(int, detection[:4])  # Coordenadas del bounding box
        confidence = detection[4]  # Confianza de la detección
        class_id = int(detection[5])  # Clase detectada

        # Dibujar el bounding box en el frame
        cv2.rectangle(frame, (x1, y1), (x2, y2), (0, 255, 0), 2)
        label = f"{model.names[class_id]}: {confidence:.2f}"
        cv2.putText(frame, label, (x1, y1 - 10), cv2.FONT_HERSHEY_SIMPLEX, 0.5, (0, 255, 0), 2)

    return frame

# @socketio.on('process_video')
# def process_video(data):
#     filename = data['filename']
#     file_path = os.path.join(VIDEO_DIR, filename)

#     if not os.path.exists(file_path):
#         socketio.emit('error', {"message": "Video not found"})
#         return

#     # Procesar el video con OpenCV
#     cap = cv2.VideoCapture(file_path)
#     while cap.isOpened():
#         ret, frame = cap.read()
#         if not ret:
#             break

#         # Detección de objetos con YOLO
#         processed_frame = detect_objects(frame)

#         # Convertir frame para envío
#         _, buffer = cv2.imencode('.jpg', processed_frame)
#         frame_data = buffer.tobytes()
#         socketio.emit('frame', frame_data)

#     cap.release()
#     socketio.emit('end_of_video')

# def detect_objects(frame):
#     # Detectar objetos en el frame usando YOLOv5
#     results = model(frame)  # Realiza detección

#     # Iterar sobre las detecciones
#     for detection in results.xyxy[0]:  # Extraer detecciones del primer resultado
#         x1, y1, x2, y2, conf, cls = map(int, detection[:6])  # Coordenadas, confianza y clase
#         class_id = int(cls)
#         confidence = detection[4]  # Confianza de la detección

#         # Dibujar el bounding box en el frame
#         cv2.rectangle(frame, (x1, y1), (x2, y2), (0, 255, 0), 2)
#         label = f"{model.names[class_id]}: {confidence:.2f}"
#         cv2.putText(frame, label, (x1, y1 - 10), cv2.FONT_HERSHEY_SIMPLEX, 0.5, (0, 255, 0), 2)

#     return frame

if __name__ == '__main__':
    socketio.run(app, debug=True, host="127.0.0.1", port=5000)
