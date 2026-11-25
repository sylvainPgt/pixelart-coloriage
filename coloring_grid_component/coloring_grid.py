import streamlit as st
import streamlit.components.v1 as components
from pathlib import Path

# Define the component name
COMPONENT_NAME = "coloring_grid"

# Check if we are in development mode (you might need a better way to check,
# like an environment variable, but this is a simple example)
# For now, assume we switch manually by commenting/uncommenting
IS_DEVELOPMENT = True # Mettre à False pour la production

if IS_DEVELOPMENT:
    # Use URL from webpack-dev-server (check port in terminal when you run 'npm start')
    _component_func = components.declare_component(
        COMPONENT_NAME,
        url="http://localhost:8080" # Adapte le port si nécessaire (souvent 8080 ou 3001)
    )
else:
    # Use path to build directory for production
    build_dir = str(Path(__file__).parent / "frontend" / "build")
    _component_func = components.declare_component(COMPONENT_NAME, path=build_dir)


def coloring_grid(grid_size: int, color_grid: list[list[str]], key=None):
    """Renders the coloring grid component."""
    component_value = _component_func(
        grid_size=grid_size,
        color_grid=color_grid, 
        key=key,
        default=None
    )
    return component_value

# Exemple d'utilisation dans Streamlit
# st.set_page_config(layout="wide")
# st.subheader("Coloring Grid Component")
# size = 5
# default_colors = [['#FFFFFF'] * size for _ in range(size)]
# clicked_cell = coloring_grid(grid_size=size, color_grid=default_colors, key="grid1")
# st.write("Cellule cliquée :", clicked_cell)