import React, { useState } from "react";
import axios from "axios";
import "./searchFrame.scss";

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
    setFrame(null);
    setFrameMetadata(null);
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
    <div className="search-frame">
      <h2>Buscar objeto en {currentVideo}</h2>
      <form onSubmit={handleSearch} className="search-form">
        <div className="search-box">
          <label>
            <strong>Objeto a Buscar:</strong>
          </label>
          <input
            className="search-frame-input"
            type="text"
            placeholder="Buscar (e.g., person, car)"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </div>
        <button type="submit" >
          Buscar
        </button>
      </form>

      {loading && !(results.length > 0) && <p>Cargando resultados...</p>}

      {error && <p style={{ color: "red" }}>{error}</p>}
      <div className="result-div">
        {results.length > 0 && (
          <>
            <div className="frame-items">
              <h3>Resultados: {totalResults}</h3>
              <ul className="frame-button-list">
                {results.map((result, index) => (
                  <li className="frame-button" key={index}>
                    <button
                      className="frame-button-content"
                      onClick={() => handleGetFrame(result.frame_index)}
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
            <div className="frame-div">
              {frame ? (
                <>
                  <h3>{currentVideo}</h3>
                  <img
                    className="frame"
                    src={frame}
                    alt="Frame"
                  />
                  {frameMetadata && (
                    <div className="frame-metadata">
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
                </>
              ) : (
                <>
                  {loading && results.length > 0 ? (
                    <h2>Cargando resultados...</h2>
                  ) : (
                    <h2>No se selecciono un momento especifico</h2>
                  )}
                </>
              )}
            </div>
          </>
        )}
      </div>

      <div className="no-result-div">
        {results.length === 0 && !loading && !error && <p>No hay resultados.</p>}
      </div>
    </div>
  );
};

export default SearchFrame;
