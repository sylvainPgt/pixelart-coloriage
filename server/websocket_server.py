# websocket_server.py
import asyncio
import numpy as np
from fastapi import FastAPI, WebSocket, WebSocketDisconnect, HTTPException
from fastapi.middleware.cors import CORSMiddleware # Pour autoriser React Dev Server
from pydantic import BaseModel
import logging

# Configuration du logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = FastAPI()

# --- Configuration CORS ---
# Autorise les requêtes depuis le serveur de dev React (ex: localhost:8080)
# et depuis Streamlit (ex: localhost:8501)
origins = [
    "http://localhost:8080", # React Dev Server (ajuste le port si besoin)
    "http://localhost:8501", # Streamlit default port
    # Ajoute d'autres origines si nécessaire (ex: l'URL de ton app déployée)
]
app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# --- Gestion de l'état de la grille (simpliste pour l'instant) ---
# ATTENTION: Ces variables globales ne sont PAS thread-safe pour une vraie prod multi-utilisateurs.
# Pour ce projet solo, ça devrait aller.
grid_state = {
    "guide_grid_rgb": None,
    "current_coloring_rgb": None,
    "grid_size": 0
}

# --- Modèles Pydantic pour la validation des données ---
class GridUpdate(BaseModel):
    i: int
    j: int
    color: str # HEX color like "#RRGGBB"

class GridErase(BaseModel):
    i: int
    j: int

class GridInitialize(BaseModel):
    grid_size: int
    guide_grid: list # On pourrait typer plus précisément mais list est simple pour démarrer

# --- Point d'API HTTP pour initialiser le guide ---
@app.post("/init_guide")
async def initialize_guide(data: GridInitialize):
    logger.info(f"Received initial guide data, size: {data.grid_size}x{data.grid_size}")
    try:
        # Convertir la liste reçue (probablement de listes de triplets) en NumPy array
        # Note: La conversion exacte dépendra de comment Streamlit envoie les données.
        # Supposons que Streamlit envoie guide_grid comme une liste de listes de [R, G, B]
        guide_array = np.array(data.guide_grid, dtype=np.uint8)

        if guide_array.shape == (data.grid_size, data.grid_size, 3):
            grid_state["guide_grid_rgb"] = guide_array
            grid_state["grid_size"] = data.grid_size
            # Initialise aussi le coloriage actuel (par ex., en blanc)
            grid_state["current_coloring_rgb"] = np.full((data.grid_size, data.grid_size, 3), (255, 255, 255), dtype=np.uint8)
            logger.info("Guide and current grid initialized successfully.")
            return {"message": "Guide initialized successfully"}
        else:
            logger.error(f"Received guide grid shape mismatch: {guide_array.shape}")
            raise HTTPException(status_code=400, detail="Grid shape mismatch")
    except Exception as e:
        logger.exception("Error initializing guide grid")
        raise HTTPException(status_code=500, detail=f"Error initializing guide: {e}")

# --- Point d'API HTTP pour récupérer la grille actuelle (pour téléchargement) ---
@app.get("/get_grid")
async def get_current_grid():
    if grid_state["current_coloring_rgb"] is not None:
        # On pourrait renvoyer l'array sous forme de liste JSON
        return {"grid": grid_state["current_coloring_rgb"].tolist()}
        # Ou même générer et renvoyer l'image directement (plus complexe)
    else:
        raise HTTPException(status_code=404, detail="Grid not initialized")

# --- Point d'API HTTP pour réinitialiser ---
@app.post("/reset")
async def reset_grid():
     if grid_state["grid_size"] > 0:
          grid_state["current_coloring_rgb"] = np.full((grid_state["grid_size"], grid_state["grid_size"], 3), (255, 255, 255), dtype=np.uint8)
          logger.info("Current grid reset to white.")
          return {"message": "Grid reset successfully"}
     else:
          raise HTTPException(status_code=404, detail="Grid not initialized")

# --- Endpoint WebSocket ---
@app.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket):
    await websocket.accept()
    logger.info("WebSocket client connected")
    try:
        while True:
            data = await websocket.receive_json() # Attend un message JSON
            logger.debug(f"Received message: {data}")

            action = data.get("action")
            i = data.get("i")
            j = data.get("j")

            if grid_state["current_coloring_rgb"] is None or grid_state["guide_grid_rgb"] is None:
                 logger.warning("Grid not initialized, ignoring message.")
                 continue # Ignore si la grille n'est pas prête

            # Vérifie les limites
            if not (0 <= i < grid_state["grid_size"] and 0 <= j < grid_state["grid_size"]):
                 logger.warning(f"Invalid coordinates received: ({i}, {j})")
                 continue

            if action == "update":
                color_hex = data.get("color")
                if color_hex:
                    try:
                       # Conversion HEX -> RGB (la même fonction que dans Streamlit)
                       h = color_hex.lstrip('#')
                       rgb = tuple(int(h[k:k+2], 16) for k in (0, 2, 4))
                       grid_state["current_coloring_rgb"][i, j] = rgb
                       # logger.debug(f"Updated cell ({i},{j}) to {rgb}") # Optionnel: log chaque update
                    except Exception as e:
                       logger.error(f"Failed to parse color {color_hex} or update grid: {e}")
            elif action == "erase":
                try:
                    guide_rgb = grid_state["guide_grid_rgb"][i, j]
                    grid_state["current_coloring_rgb"][i, j] = guide_rgb
                    # logger.debug(f"Erased cell ({i},{j}) to {guide_rgb}") # Optionnel
                except Exception as e:
                   logger.error(f"Failed to erase cell ({i},{j}): {e}")
            else:
                logger.warning(f"Unknown action received: {action}")

            # On pourrait renvoyer un message de confirmation au client si besoin
            # await websocket.send_json({"status": "ok", "i": i, "j": j})

    except WebSocketDisconnect:
        logger.info("WebSocket client disconnected")
    except Exception as e:
        logger.exception("An error occurred in the WebSocket connection")
        await websocket.close(code=1011) # Internal Server Error

# --- Pour lancer le serveur (si on exécute ce fichier directement) ---
if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000) # Utilise le port 8000 par défaut