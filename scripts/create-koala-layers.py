"""Export the existing koala artwork as joint-centered SVG layers (no redraw)."""
from copy import deepcopy
from pathlib import Path
import xml.etree.ElementTree as ET

ROOT = Path(__file__).resolve().parents[1] / "assets/mascot"
NS = "http://www.w3.org/2000/svg"
ET.register_namespace("", NS)
source = ET.parse(ROOT / "koala.svg").getroot()
character = next(g for g in source if g.get("id") == "character")

def export(name, children, viewbox="0 0 512 512"):
    svg = ET.Element(f"{{{NS}}}svg", {"viewBox": viewbox, "fill": "none"})
    svg.extend(children)
    ET.ElementTree(svg).write(ROOT / name, encoding="unicode")

body = deepcopy(character)
for child in list(body):
    if child.get("id") in ("head", "arm-left"):
        body.remove(child)
export("koala-body.svg", [body])
export("koala-shadow.svg", [deepcopy(next(g for g in source if g.get("id") == "shadow"))])
head_character = ET.Element(f"{{{NS}}}g", {"transform": character.get("transform")})
head = deepcopy(next(g for g in character if g.get("id") == "head"))
for child in list(head):
    if child.get("id") in ("eye-left", "eye-right"):
        head.remove(child)
head_character.append(head)
export("koala-head.svg", [head_character], "56 64 400 400")
arm = deepcopy(next(g for g in character if g.get("id") == "arm-left"))
arm.attrib.pop("transform")
export("koala-left-arm.svg", [arm], "-100 -100 200 200")
eye = deepcopy(next(g for g in next(g for g in character if g.get("id") == "head") if g.get("id") == "eye-left"))
eye.attrib.pop("transform")
export("koala-eye.svg", [eye], "-16 -16 32 32")
