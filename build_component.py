# build_component.py
import subprocess
import os

base_dir = os.path.dirname(__file__)
frontend_dir = os.path.join(base_dir, "coloring_grid_component", "frontend")

subprocess.run(["npm", "run", "build"], cwd=frontend_dir, shell=True)
print("✅ Composant React compilé avec succès.")
