from flask import Flask, jsonify, send_file, request
from flask_cors import CORS, cross_origin
import redis
import os
import json

app = Flask(__name__)
CORS(app)

# Conexión a Redis
redis_client = redis.StrictRedis(
    host='redis-18936.c274.us-east-1-3.ec2.redns.redis-cloud.com',
    port=18936,
    password='UTCq3LmjUHjqmEmmM4fe6UMkYBze3U2L',
    decode_responses=True  # Decodifica automáticamente las respuestas de Redis a strings
)

# Directorio donde se almacenan las imágenes
# IMAGE_DIR = "../upload-video/imagenes/"   # for dev
IMAGE_DIR = "data/imagenes/"

@app.route("/frame", methods=["GET"])
@cross_origin()
def get_frame():
    video = request.args.get("video")
    frame = request.args.get("frame")
    try:
        # Recuperar metadata del frame desde Redis
        # video:[nombre].mp4:frame:id
        redis_key = f"video:{video}:frame:{frame}"
        metadata = redis_client.execute_command('JSON.GET', redis_key, '.')
        if metadata is None:
            print(f"frame {frame} no encontrado")
            return jsonify({"error": "Frame not found"}), 404

        # print(f"Metadata recuperada: {metadata}")

        # Decodificar metadata JSON
        metadata = eval(metadata)  # Redis devuelve strings para JSON
        
        # Ruta de la imagen asociada al frame
        image_path = metadata.get("image_path")
        # image_path = f"../upload-video/{image_path}"  # for dev
        image_path = f"{image_path}"

        if not image_path or not os.path.exists(image_path):
            print(f"Imagen {image_path} no encontrada")
            return jsonify({"error": "Image file not found"}), 404

        print(f"buscando: {image_path}")

        # Responder con metadata y enviar la URL de la imagen
        msj = {
            "metadata": metadata,
            "image_endpoint": f"/image/{os.path.basename(image_path)}"
        }
        response = jsonify(msj)
        response.status_code = 200
        return response

    except Exception as e:
        print(f"Error al recuperar frame: {str(e)}")
        return jsonify({"error": str(e)}), 500

@app.route("/image/<filename>", methods=["GET"])
@cross_origin()
def get_image(filename):
    # Ruta completa de la imagen solicitada
    image_path = os.path.join(IMAGE_DIR, filename)
    print(f"enviando: {image_path}")

    if not os.path.exists(image_path):
        print(f"imagen {image_path} no encontrado")
        return jsonify({"error": "Image file not found"}), 404
    return send_file(image_path, mimetype='image/jpeg')

# if __name__ == "__main__":
#     app.run(host="0.0.0.0", port=5003, debug=True)