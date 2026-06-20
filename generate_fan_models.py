import math

def format_obj(vertices, faces):
    out = ""
    for i, (x, y, z) in enumerate(vertices):
        out += f"{i+1} {x:.6f} {y:.6f} {z:.6f}\n"
    out += "Faces:\n"
    for f in faces:
        out += " ".join(map(str, f)) + ".\n"
    return out

def combine_meshes(*meshes):
    all_v = []
    all_f = []
    for v, f in meshes:
        offset = len(all_v)
        all_v.extend(v)
        all_f.extend([[idx + offset for idx in face] for face in f])
    return all_v, all_f

def generate_cylinder(radius, height, sides, offset_val, axis='z'):
    vertices = []
    # Bottom circle
    for i in range(sides):
        a = 2 * math.pi * i / sides
        if axis == 'z':
            vertices.append((radius * math.cos(a), radius * math.sin(a), offset_val))
        elif axis == 'y':
            vertices.append((radius * math.cos(a), offset_val, radius * math.sin(a)))
        elif axis == 'x':
            vertices.append((offset_val, radius * math.cos(a), radius * math.sin(a)))
    # Top circle
    for i in range(sides):
        a = 2 * math.pi * i / sides
        if axis == 'z':
            vertices.append((radius * math.cos(a), radius * math.sin(a), offset_val + height))
        elif axis == 'y':
            vertices.append((radius * math.cos(a), offset_val + height, radius * math.sin(a)))
        elif axis == 'x':
            vertices.append((offset_val + height, radius * math.cos(a), radius * math.sin(a)))

    # Centers
    v_b = len(vertices) + 1
    if axis == 'z':
        vertices.append((0, 0, offset_val))
    elif axis == 'y':
        vertices.append((0, offset_val, 0))
    elif axis == 'x':
        vertices.append((offset_val, 0, 0))
        
    v_t = len(vertices) + 1
    if axis == 'z':
        vertices.append((0, 0, offset_val + height))
    elif axis == 'y':
        vertices.append((0, offset_val + height, 0))
    elif axis == 'x':
        vertices.append((offset_val + height, 0, 0))

    faces = []
    for i in range(sides):
        n = (i + 1) % sides
        faces.append([v_b, n + 1, i + 1]) # Bottom
        faces.append([v_t, i + 1 + sides, n + 1 + sides]) # Top
        faces.append([i + 1, n + 1, n + 1 + sides, i + 1 + sides]) # Sides
        
    return vertices, faces

def generate_fan_base():
    # Asumiendo theta=0, phi=0 en la proyección:
    # Eje X va hacia ABAJO (Pantalla)
    # Eje Y va hacia DERECHA (Pantalla)
    # Eje Z va hacia el FONDO (Profundidad)

    # Piso en X = 2.0 (disco apuntando en X)
    b_v, b_f = generate_cylinder(radius=1.5, height=0.2, sides=24, offset_val=2.0, axis='x')
    # Poste en X, desde X=0 hasta X=2.0, en Z=0
    p_v, p_f = generate_cylinder(radius=0.15, height=2.0, sides=12, offset_val=0.0, axis='x')
    # Motor en Z, cruzando el poste. Desde Z=-0.4 (frente) a Z=0.8 (atrás)
    # (El offset de 'z' empieza en offset_val y va hasta offset_val + height)
    m_v, m_f = generate_cylinder(radius=0.4, height=1.2, sides=16, offset_val=-0.4, axis='z')
    
    return combine_meshes((b_v, b_f), (p_v, p_f), (m_v, m_f))

def generate_blade():
    # Aspas al frente del motor (Z = -0.5)
    vertices = [
        # Back surface (Z = -0.55)
        (0.2, -0.1, -0.55),    # 1
        (1.8, -0.3, -0.65),    # 2
        (2.0, 0, -0.55),       # 3
        (1.5, 0.4, -0.55),     # 4
        (0.2, 0.1, -0.55),     # 5
        # Front surface (Z = -0.45)
        (0.2, -0.1, -0.45),    # 6
        (1.8, -0.3, -0.55),    # 7
        (2.0, 0, -0.45),       # 8
        (1.5, 0.4, -0.45),     # 9
        (0.2, 0.1, -0.45),     # 10
    ]
    faces = [
        [1, 5, 4, 3, 2], # Back
        [6, 7, 8, 9, 10], # Front
        [1, 2, 7, 6],
        [2, 3, 8, 7],
        [3, 4, 9, 8],
        [4, 5, 10, 9],
        [5, 1, 6, 10]
    ]
    return vertices, faces

def rotate_z(vertices, angle):
    rotated = []
    for x, y, z in vertices:
        nx = x * math.cos(angle) - y * math.sin(angle)
        ny = x * math.sin(angle) + y * math.cos(angle)
        rotated.append((nx, ny, z))
    return rotated

def generate_rotor():
    num_blades = 3
    # Hub en el eje Z (apuntando a la cámara, desde Z=-0.6 a Z=-0.4)
    hub_v, hub_f = generate_cylinder(radius=0.3, height=0.2, sides=12, offset_val=-0.6, axis='z')
    
    blade_v, blade_f = generate_blade()
    
    meshes = [(hub_v, hub_f)]
    for i in range(num_blades):
        angle = 2 * math.pi * i / num_blades
        rot_v = rotate_z(blade_v, angle)
        meshes.append((rot_v, blade_f))
        
    return combine_meshes(*meshes)

base_v, base_f = generate_fan_base()
rotor_v, rotor_f = generate_rotor()

base_str = format_obj(base_v, base_f)
rotor_str = format_obj(rotor_v, rotor_f)

ts_content = f'''export const fanBase = `{base_str}`;
export const fanRotor = `{rotor_str}`;
'''

with open('src/fanModels.ts', 'w', encoding='utf-8') as f:
    f.write(ts_content)

with open('ventilador_base.txt', 'w', encoding='utf-8') as f:
    f.write(base_str)
with open('ventilador_aspas.txt', 'w', encoding='utf-8') as f:
    f.write(rotor_str)
