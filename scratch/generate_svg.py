import json

left_muscles = [
    {
        "id": "l_trap_upper",
        "name": "좌측 상부 승모근 (L Upper Trapezius)",
        "d": "M250 120 C240 90, 230 70, 220 70 C200 90, 160 130, 140 160 C180 160, 210 180, 210 200 Z"
    },
    {
        "id": "l_trap_lower",
        "name": "좌측 중/하부 승모근 (L Mid/Lower Trapezius)",
        "d": "M250 150 C240 160, 220 180, 210 200 C210 220, 220 280, 250 350 Z"
    },
    {
        "id": "l_deltoid",
        "name": "좌측 삼각근 (L Deltoid)",
        "d": "M140 160 C120 170, 100 210, 110 250 C130 260, 140 240, 150 220 C170 210, 210 200, 210 200 C180 160, 140 160, 140 160 Z"
    },
    {
        "id": "l_latissimus",
        "name": "좌측 광배근 (L Latissimus Dorsi)",
        "d": "M150 220 C140 250, 140 380, 160 500 C180 520, 220 540, 250 550 L250 350 C230 330, 220 300, 220 280 C210 250, 180 230, 150 220 Z"
    },
    {
        "id": "l_infraspinatus",
        "name": "좌측 극하근/대원근 (L Infraspinatus/Teres)",
        "d": "M210 200 C215 230, 220 250, 220 280 C200 260, 160 240, 150 220 C170 210, 180 210, 210 200 Z"
    },
    {
        "id": "l_triceps",
        "name": "좌측 삼두근 (L Triceps)",
        "d": "M110 250 C100 300, 90 340, 95 360 C110 360, 120 350, 125 350 C135 300, 140 250, 150 220 C140 240, 130 260, 110 250 Z"
    },
    {
        "id": "l_oblique",
        "name": "좌측 외복사근 (L External Oblique)",
        "d": "M145 350 C130 400, 135 460, 140 510 C145 505, 155 505, 160 500 C140 380, 140 250, 150 220 Z"
    },
    {
        "id": "l_gluteus",
        "name": "좌측 대둔근 (L Gluteus Maximus)",
        "d": "M140 510 C130 550, 140 640, 170 660 C210 660, 230 640, 250 610 L250 550 C220 540, 180 520, 160 500 C155 505, 145 505, 140 510 Z"
    }
]

def mirror_path(d_string):
    import re
    commands = re.findall(r'([MCLZ])([^MCLZ]*)', d_string)
    flipped_commands = []
    
    for cmd, argsStr in commands:
        if cmd == 'Z':
            flipped_commands.append('Z')
            continue
            
        nums = [float(n) for n in re.findall(r'-?\d+\.?\d*', argsStr)]
        flipped_nums = []
        for i in range(len(nums)):
            if i % 2 == 0:
                flipped_nums.append(round(500 - nums[i], 1))
            else:
                flipped_nums.append(nums[i])
                
        if cmd == 'M' or cmd == 'L':
            parts = [f"{flipped_nums[i]:g} {flipped_nums[i+1]:g}" for i in range(0, len(flipped_nums), 2)]
            flipped_commands.append(f"{cmd}{', '.join(parts)}")
        elif cmd == 'C':
            parts = [f"{flipped_nums[i]:g} {flipped_nums[i+1]:g}" for i in range(0, len(flipped_nums), 2)]
            cur_parts = []
            for i in range(0, len(parts), 3):
                cur_parts.append(f"{parts[i]}, {parts[i+1]}, {parts[i+2]}")
            flipped_commands.append(f"C{' '.join(cur_parts)}")
            
    return ' '.join(flipped_commands)

all_muscles = []
for m in left_muscles:
    all_muscles.append(m)
    right_id = m["id"].replace("l_", "r_")
    right_name = m["name"].replace("좌측", "우측").replace("L ", "R ")
    right_d = mirror_path(m["d"])
    all_muscles.append({
        "id": right_id,
        "name": right_name,
        "d": right_d
    })

fascia_path = "M250 350 C230 400, 210 480, 220 540 C230 570, 240 590, 250 610 C260 590, 270 570, 280 540 C290 480, 270 400, 250 350 Z"
all_muscles.append({
    "id": "fascia",
    "name": "흉요근막 (Thoracolumbar Fascia)",
    "d": fascia_path
})

svg_content = f"""<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 500 700" width="100%" height="100%">
  <style>
    .background {{ fill: #f8fafc; rx: 16px; ry: 16px; }}
    .muscle {{
      fill: #8B0000;
      stroke: #fff;
      stroke-width: 1.5;
      cursor: pointer;
      transition: fill 0.2s, transform 0.2s;
      transform-origin: center;
      transform-box: fill-box;
    }}
    .muscle:hover {{
      fill: #b91c1c;
      transform: scale(1.01);
    }}
    .muscle.active {{
      fill: #ef4444; /* Bright Red */
      stroke: #f87171;
      stroke-width: 3;
      transform: scale(1.02);
    }}
    .fascia {{
      fill: #e5e7eb;
      stroke: #9ca3af;
      stroke-width: 1.5;
    }}
    #tooltip {{
      font-family: sans-serif;
      font-size: 14px;
      font-weight: bold;
      fill: #333;
      pointer-events: none;
      opacity: 0;
      transition: opacity 0.2s;
    }}
    #tooltip-bg {{
      fill: white;
      stroke: #ccc;
      rx: 4; ry: 4;
      pointer-events: none;
      opacity: 0;
      transition: opacity 0.2s;
    }}
    #selected-names {{
      font-family: sans-serif;
      font-size: 14px;
      fill: #1f2937;
    }}
  </style>

  <defs>
    <filter id="shadow" x="-20%" y="-20%" width="140%" height="140%">
      <feDropShadow dx="0" dy="4" stdDeviation="4" flood-opacity="0.1" />
    </filter>
  </defs>

  <rect width="100%" height="100%" class="background" />
  
  <text x="250" y="40" text-anchor="middle" font-family="sans-serif" font-weight="bold" font-size="20" fill="#374151">
    근육계 후면 다이어그램
  </text>
  
  <g id="muscle-group" filter="url(#shadow)">
"""

for m in all_muscles:
    cls = "muscle fascia" if m["id"] == "fascia" else "muscle"
    svg_content += f'    <path id="{m["id"]}" class="{cls}" d="{m["d"]}" data-name="{m["name"]}"></path>\n'

svg_content += """  </g>

  <!-- Tooltip elements -->
  <rect id="tooltip-bg" x="0" y="0" width="200" height="30" />
  <text id="tooltip" x="0" y="0" text-anchor="middle">Tooltip</text>

  <!-- Legend area -->
  <rect x="20" y="650" width="460" height="40" fill="white" rx="8" stroke="#e5e7eb" />
  <text x="250" y="675" id="selected-names" text-anchor="middle">선택된 근육: 없음</text>

  <script>
    <![CDATA[
      const muscles = document.querySelectorAll('.muscle');
      const tooltip = document.getElementById('tooltip');
      const tooltipBg = document.getElementById('tooltip-bg');
      const selectedNamesText = document.getElementById('selected-names');
      const svg = document.querySelector('svg');
      
      const activeMuscles = new Set();
      
      function updateSelectedList() {
        if (activeMuscles.size === 0) {
          selectedNamesText.textContent = "선택된 근육: 없음";
        } else {
          const names = Array.from(activeMuscles).map(id => document.getElementById(id).getAttribute('data-name').split(' (')[0]);
          selectedNamesText.textContent = "선택: " + names.join(', ');
        }
      }

      muscles.forEach(m => {
        m.addEventListener('click', (e) => {
          m.classList.toggle('active');
          if (m.classList.contains('active')) {
            activeMuscles.add(m.id);
          } else {
            activeMuscles.delete(m.id);
          }
          updateSelectedList();
        });

        m.addEventListener('mousemove', (e) => {
          tooltip.textContent = m.getAttribute('data-name');
          // Calculate bbox for tooltip background
          const textBBox = tooltip.getBBox();
          const padding = 8;
          
          let pt = svg.createSVGPoint();
          pt.x = e.clientX;
          pt.y = e.clientY;
          let svgP = pt.matrixTransform(svg.getScreenCTM().inverse());
          
          tooltip.setAttribute('x', svgP.x);
          tooltip.setAttribute('y', svgP.y - 15);
          tooltip.style.opacity = 1;
          
          tooltipBg.setAttribute('x', svgP.x - textBBox.width/2 - padding);
          tooltipBg.setAttribute('y', svgP.y - 15 - textBBox.height + padding/2);
          tooltipBg.setAttribute('width', textBBox.width + padding * 2);
          tooltipBg.setAttribute('height', textBBox.height + padding);
          tooltipBg.style.opacity = 0.9;
        });

        m.addEventListener('mouseout', () => {
          tooltip.style.opacity = 0;
          tooltipBg.style.opacity = 0;
        });
      });
    ]]>
  </script>
</svg>
"""

with open("c:/Users/zetz1/OneDrive/Desktop/Progress Note with Grok/pt-progress-note/public/posterior_muscles.svg", "w", encoding="utf-8") as f:
    f.write(svg_content)
