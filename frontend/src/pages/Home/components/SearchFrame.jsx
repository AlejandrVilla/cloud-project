import React, { useState } from "react";
import axios from "axios";

const SEARCH_URL = `http://${import.meta.env.VITE_SERVER_URL}/videos/search`;
const GET_FRAME_URL = `http://${import.meta.env.VITE_SERVER_URL}/frame`;
const GET_IMAGE_URL = `http://${import.meta.env.VITE_SERVER_URL}/frame`; 

// const SEARCH_URL = `http://${import.meta.env.VITE_DEV_SERVER_URL}:5001/search`;
// const GET_FRAME_URL = `http://${import.meta.env.VITE_DEV_SERVER_URL}:5003/frame`;
// const GET_IMAGE_URL = `http://${import.meta.env.VITE_DEV_SERVER_URL}:5003`;

let totalResults = 0;

const SearchFrame = ({ currentVideo }) => {
  const [query, setQuery] = useState(""); // Para el término de búsqueda
  const [results, setResults] = useState([]); // Para almacenar los resultados
  const [loading, setLoading] = useState(false); // Para mostrar un indicador de carga
  const [frameMetadata, setFrameMetadata] = useState(null); // Metadata del frame seleccionado
  const [error, setError] = useState(null); // Para manejar errores
  const [frame, setFrame] = useState(null); // Imagen del frame

  const handleSearch = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setResults([]);
    try {
      // Construir la URL con los parámetros
      const response = await axios.get(SEARCH_URL, {
        params: {
          video: currentVideo,
          object: query,
        },
      });
      setResults(response.data.matching_frames);
      totalResults = response.data.total_results;
    } catch (err) {
      setError(
        err.response?.data?.message || "Error al buscar en la base de datos"
      );
    } finally {
      setLoading(false);
    }
  };
  // console.log(frameMetadata);
  const handleGetFrame = async (frameIndex) => {
    setLoading(true);
    setError(null);
    setFrameMetadata(null);
    setFrame(null);

    try {
      // Obtener metadata del frame
      const response = await axios.get(GET_FRAME_URL, {
        params: {
          video: currentVideo,
          frame: frameIndex,
        },
      });
      setFrameMetadata(response.data);

      // Obtener imagen del frame
      const imgResponse = await axios.get(
        `${GET_IMAGE_URL}${response.data.image_endpoint}`,
        { responseType: "blob" }
      );
      const imgUrl = URL.createObjectURL(imgResponse.data);
      setFrame(imgUrl);
    } catch (err) {
      setError(
        err.response?.data?.error || "Error al cargar el frame o la imagen"
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ padding: "20px" }}>
      <h2>Buscar Frames por Objeto</h2>
      <form onSubmit={handleSearch} style={{ marginBottom: "20px" }}>
        <div style={{ marginBottom: "10px" }}>
          <label>
            <strong>Objeto a Buscar:</strong>
          </label>
          <input
            type="text"
            placeholder="Buscar (e.g., person, car)"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            style={{
              padding: "10px",
              fontSize: "16px",
              width: "300px",
              marginRight: "10px",
            }}
          />
        </div>
        <button type="submit" style={{ padding: "10px 20px", fontSize: "16px" }}>
          Buscar
        </button>
      </form>

      {loading && <p>Cargando resultados...</p>}

      {error && <p style={{ color: "red" }}>{error}</p>}

      <div>
        {results.length > 0 && (
          <div>
            <h3>Resultados: {totalResults}</h3>
            <ul style={{ listStyle: "none", padding: 0 }}>
              {results.map((result, index) => (
                <li key={index} style={{ marginBottom: "10px" }}>
                  <button
                    onClick={() => handleGetFrame(result.frame_index)}
                    style={{
                      border: "1px solid #ddd",
                      padding: "10px",
                      borderRadius: "5px",
                      cursor: "pointer",
                      width: "100%",
                    }}
                  >
                    <p>
                      <strong>Frame Index:</strong> {result.frame_index}
                    </p>
                    <p>
                      <strong>Tiempo:</strong> {result.frame_time.toFixed(2)} s
                    </p>
                  </button>
                </li>
              ))}
            </ul>
          </div>
        )}

        {results.length === 0 && !loading && !error && <p>No hay resultados.</p>}
      </div>

      {frame && (
        <div style={{ marginTop: "20px" }}>
          <h3>Frame Seleccionado</h3>
          <img
            src={frame}
            alt="Frame"
            style={{ maxWidth: "100%", height: "auto", border: "1px solid #ddd" }}
          />
          {frameMetadata && (
            <div style={{ marginTop: "10px" }}>
              <p>
                <strong>Frame:</strong> {frameMetadata.metadata.frame_index}
              </p>
              <p>
                <strong>Momento:</strong> {frameMetadata.metadata.frame_time.toFixed(2)}
              </p>
              <p>
                <strong>Ruta de la Imagen:</strong> {frameMetadata.metadata.image_path}
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default SearchFrame;
