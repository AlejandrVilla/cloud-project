from flask import Flask, jsonify, request
from flask_cors import CORS, cross_origin
import redis
import json
import os

app = Flask(__name__)
CORS(app)

# Conexión a Redis
redis_client = redis.StrictRedis(
    host='redis-18936.c274.us-east-1-3.ec2.redns.redis-cloud.com',
    port=18936,
    password='UTCq3LmjUHjqmEmmM4fe6UMkYBze3U2L',
    decode_responses=True  # Decodifica automáticamente las respuestas de Redis a strings
)

# VIDEO_DIR = "../upload-video/videos/"     # for dev
VIDEO_DIR = "videos/"

os.makedirs(VIDEO_DIR, exist_ok=True)

@app.route('/videos', methods=['GET'])
@cross_origin()
def list_videos():
    videos = os.listdir(VIDEO_DIR)
    return jsonify(videos)

# corregir para que las consultas regresen solo los objetos en el video especificado
@app.route("/search", methods=["GET"])
@cross_origin()
def search_objects():
    video = request.args.get("video")
    object_label = request.args.get("object")

    if not object_label:
        return jsonify({"error": "Missing 'object' parameter"}), 400

    print(f"Buscando '{object_label}' en el índice 'video_index' para el video '{video}'")
    try:
        # Construir consulta para RediSearch con límite de 20 resultados
        query = f'@label:{{{object_label}}}'
        results = redis_client.execute_command('FT.SEARCH', 'video_index', query, 'LIMIT', 0, 100)

        # Procesar resultados
        matching_frames = []
        if len(results) > 1:
            num_results = results[0]                # Número total de resultados
            for i in range(1, len(results), 2):     # Iterar en pares clave, valores
                frame_key = results[i]              # Clave del frame
                frame_value = results[i + 1]        # Contenido asociado
                if frame_value and isinstance(frame_value, list) and len(frame_value) > 1:
                    # El contenido del frame está en el segundo elemento del par [FIELD, VALUE]
                    frame_data = json.loads(frame_value[1])
                    # Filtrar por video_name
                    if frame_data.get("video_name") == video:
                        matching_frames.append(frame_data)

        if not matching_frames:
            print(f"No se encontró '{object_label}' en el video '{video}'")
            return jsonify({"message": "No matches found"}), 404

        print(f"Coincidencias: {num_results}, recuperados: {len(results) - 1}, enviados: {len(matching_frames)}")
        return jsonify({
            "total_results": len(matching_frames),  # Número total de coincidencias filtradas
            "matching_frames": matching_frames
        }), 200

    except Exception as e:
        print(f"Error: {str(e)}")
        return jsonify({"error": str(e)}), 500


# if __name__ == "__main__":
#     app.run(host="0.0.0.0", port=5001, debug=True)