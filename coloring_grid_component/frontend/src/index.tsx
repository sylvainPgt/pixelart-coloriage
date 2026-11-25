import React, { useState, useEffect, useRef, useCallback } from "react"
import ReactDOM from "react-dom/client"
import {
  Streamlit,
  withStreamlitConnection,
  ComponentProps,
} from "streamlit-component-lib"

interface ColoringGridProps extends ComponentProps {
  grid_size: number;
  // Optionnel mais utile: passe le guide pour l'outil gomme côté React
  guide_grid_hex: string[][];
}

const ColoringGrid = withStreamlitConnection((props: ColoringGridProps) => {
  const { grid_size, guide_grid_hex } = props.args || {}; // Récupère les props

  // État pour la grille affichée par React (initialisée blanche ou basée sur guide?)
  // Initialisons blanche pour l'instant
  const [displayGrid, setDisplayGrid] = useState<string[][]>(() =>
     Array(grid_size).fill(0).map(() => Array(grid_size).fill("#ffffff"))
  );
  const [selectedColor, setSelectedColor] = useState<string>("#ffffff"); // Couleur du "PEN"
  const [selectedTool, setSelectedTool] = useState<"PEN" | "ERASER">("PEN");

  const ws = useRef<WebSocket | null>(null); // Pour stocker la connexion WebSocket

  console.log("Props reçues:", props.args); // Garde ce log pour vérifier

  useEffect(() => {
    // Connexion au serveur WebSocket (adapte le port si nécessaire)
    const wsUrl = "ws://localhost:8000/ws";
    const socket = new WebSocket(wsUrl);

    socket.onopen = () => {
      console.log("WebSocket Connected");
    };

    socket.onclose = () => {
      console.log("WebSocket Disconnected");
    };

    socket.onerror = (error) => {
      console.error("WebSocket Error:", error);
    };

    // Optionnel: Gérer les messages reçus du serveur
    // socket.onmessage = (event) => {
    //   console.log("Message from server:", event.data);
    // };

    ws.current = socket; // Stocke la connexion dans la ref

    // Nettoyage à la fermeture du composant
    return () => {
      console.log("Closing WebSocket");
      ws.current?.close();
    };
  }, []); // Le tableau vide [] assure que l'effet ne s'exécute qu'au montage/démontage

  // --- Ajoute cette partie dans le JSX, avant la grille ---
  const palette = ["#FFFFFF", "#000000", "#FF0000", "#00FF00", "#0000FF", "#FFFF00", "#FF00FF", "#00FFFF"]; // Ta palette

  const handleColorSelect = (color: string) => {
    setSelectedColor(color);
    setSelectedTool("PEN");
  };

  const handleEraserSelect = () => {
    setSelectedTool("ERASER");
  };
  // --- Fin ajout ---

  if (!Array.isArray(color_grid) || color_grid.length === 0 || !Array.isArray(color_grid[0])) {
    // Légère amélioration de la condition pour gérer grille vide
    return <div>⏳ Chargement de la grille...</div>
  }

  const handleClick = useCallback((i: number, j: number) => {
    if (!ws.current || ws.current.readyState !== WebSocket.OPEN) {
      console.error("WebSocket not connected.");
      return;
    }

    let newColor: string;
    let action: string;

    if (selectedTool === "ERASER") {
      // Récupère la couleur du guide pour l'affichage immédiat
      // Attention: guide_grid_hex peut ne pas être défini si props.args est vide initialement
      newColor = guide_grid_hex?.[i]?.[j] || "#ffffff"; // Fallback blanc
      action = "erase";
      // Envoie l'action au serveur WS
      ws.current.send(JSON.stringify({ action, i, j }));
    } else { // PEN
      newColor = selectedColor;
      action = "update";
      // Envoie l'action ET la couleur au serveur WS
      ws.current.send(JSON.stringify({ action, i, j, color: newColor }));
    }

    // --- Mise à jour IMMÉDIATE de l'état local React ---
    // Crée une copie de la grille pour ne pas muter l'état directement
    const newGrid = displayGrid.map(row => [...row]);
    if (newGrid[i] && newGrid[i][j] !== undefined) {
         newGrid[i][j] = newColor;
         setDisplayGrid(newGrid); // Met à jour l'état React -> l'UI change instantanément
    } else {
         console.error("Error updating local display grid - invalid indices?", i, j);
    }

    // On n'appelle PLUS Streamlit.setComponentValue ici pour les clics de grille

 }, [selectedTool, selectedColor, displayGrid, guide_grid_hex]); // Dépendances du useCallback

  const cellStyle: React.CSSProperties = {
    width: 20,
    height: 20,
    border: "1px solid gray",
    display: "inline-block",
    margin: 0,
    padding: 0,
  }

  return (
    <div> {/* Conteneur principal */}
      {/* Rendu de la Palette */}
      <div style={{ marginBottom: '10px' }}>
        <h3>Palette</h3>
        {palette.map((color) => (
          <div
            key={color}
            onClick={() => handleColorSelect(color)}
            style={{
              display: 'inline-block',
              width: '25px',
              height: '25px',
              backgroundColor: color,
              border: selectedTool === "PEN" && selectedColor === color ? '3px solid black' : '1px solid #ccc',
              margin: '2px',
              cursor: 'pointer',
              borderRadius: '4px'
            }}
          />
        ))}
        {/* Bouton Gomme */}
        <button
           onClick={handleEraserSelect}
           style={{
               marginLeft: '10px',
               padding: '5px',
               border: selectedTool === "ERASER" ? '3px solid black' : '1px solid #ccc',
               borderRadius: '4px'
           }}>
           Gomme 🧽
        </button>
      </div>

      {/* Affichage outil sélectionné (optionnel) */}
      <div style={{ marginBottom: '10px', height: '30px' }}>
           {selectedTool === "PEN" ? `Couleur: ${selectedColor}` : "Outil: Gomme"}
      </div>


      {/* Grille (ton code existant, mais utilisant displayGrid) */}
      <div style={{ lineHeight: 0 }}>
        {displayGrid.flatMap((row: string[], i: number) =>
           row.map((cellColor: string, j: number) => {
             // Note: cellColor vient de l'état React displayGrid maintenant
             return (
               <div
                 key={`<span class="math-inline">\{i\}\-</span>{j}`} // Clé corrigée
                 onClick={() => handleClick(i, j)} // handleClick doit être adapté
                 style={{
                   width: 20, // Garde tes styles de cellule
                   height: 20,
                   border: "1px solid gray",
                   display: "inline-block",
                   margin: 0,
                   padding: 0,
                   backgroundColor: cellColor, // Utilise cellColor de displayGrid
                 }}
               />
             );
           })
        )}
      </div>
    </div>
  );

const root = ReactDOM.createRoot(document.getElementById("root")!)
root.render(<ColoringGrid />)