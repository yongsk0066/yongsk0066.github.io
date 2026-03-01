import { useEffect, useRef, useState } from 'react';

interface TransformProps {
  x: number;
  y: number;
  cx: number;
  cy: number;
  time: number;
}

type Transform = (props: TransformProps) => [number, number];

const spiral: Transform = ({ x, y, cx, cy, time }) => {
  const dx = x - cx;
  const dy = y - cy;
  const dist = Math.sqrt(dx ** 2 + dy ** 2);
  const currAngle = Math.atan2(dy, dx);
  const newAngle = currAngle - Math.sqrt(dist) * time * 0.5;
  const tx = cx + Math.cos(newAngle) * dist;
  const ty = cy + Math.sin(newAngle) * dist;
  return [tx, ty];
};

const wave: Transform = ({ x, y, time }) => {
  const waveSpeed = 2;
  const waveHeight = Math.sin(x * 10 + time * waveSpeed);
  return [x, y + waveHeight * 0.05];
};

const zoom: Transform = ({ x, y, cx, cy, time }) => {
  const scale = Math.sin(time) * 0.5 + 1;
  const dx = x - cx;
  const dy = y - cy;
  const tx = cx + dx * scale;
  const ty = cy + dy * scale;
  return [tx, ty];
};

const shake: Transform = ({ x, y, time }) => {
  const shakeIntensity = Math.sin(time * 10) * 0.1;
  return [x + shakeIntensity, y];
};

const rotate: Transform = ({ x, y, cx, cy, time }) => {
  const angle = time * 0.1;
  const dx = x - cx;
  const dy = y - cy;
  const tx = cx + dx * Math.cos(angle) - dy * Math.sin(angle);
  const ty = cy + dx * Math.sin(angle) + dy * Math.cos(angle);
  return [tx, ty];
};

const hurricane: Transform = ({ x, y, cx, cy, time }) => {
  const angle = time * 0.5;
  const dx = x - cx;
  const dy = y - cy;
  const dist = Math.sqrt(dx ** 2 + dy ** 2);
  const tx = cx + dx * Math.cos(angle) - dy * Math.sin(angle) * dist * 0.01;
  const ty = cy + dx * Math.sin(angle) + dy * Math.cos(angle) * dist * 0.01;
  return [tx, ty];
};

const celestialOrbit: Transform = ({ x, y, cx, cy, time }) => {
  const dx = x - cx;
  const dy = y - cy;
  const dist = Math.sqrt(dx ** 2 + dy ** 2);
  const initialAngle = Math.atan2(dy, dx);
  const period = 2 * Math.PI;
  const orbitSpeed = 1;
  const majorAxis = dist;
  const minorAxis = dist * 0.6;
  const angle = initialAngle + ((time * orbitSpeed) % period);
  const tx = cx + Math.cos(angle) * majorAxis;
  const ty = cy + Math.sin(angle) * minorAxis;
  return [tx, ty];
};

const fractalMotion: Transform = ({ x, y, cx, cy, time }) => {
  const dx = x - cx;
  const dy = y - cy;
  const dist = Math.sqrt(dx ** 2 + dy ** 2);
  const initialAngle = Math.atan2(dy, dx);
  const fractalScale = Math.sin(time) * 0.5 + 1.5;
  const angle = initialAngle + Math.sin(time * 0.5) * 2 * Math.PI;
  const tx = cx + Math.cos(angle) * dist * fractalScale;
  const ty = cy + Math.sin(angle) * dist * fractalScale;
  return [tx, ty];
};

const transformMap = {
  spiral,
  wave,
  zoom,
  shake,
  rotate,
  hurricane,
  celestialOrbit,
  fractalMotion,
};

type TransformKey = keyof typeof transformMap;

const text = `
/helloWorld Sed ut peperspiciatis unde omnis iste natusrspiciatis unde omnis iste natus error sit.
/helloWorld voluptatetem accusantium doloremque laudantium,m accusantium doloremque laudantium, totam rem aperiam, eaque ipsa quae ab illo inventore verita.
/helloWorld eaque ipspsa quae ab illo inventorea quae ab illo inventore veritatis et quasieaque ipsa quae ab illo inventore verita.
/helloWorld architectcto beatae vitae dicta sunto beatae vitae dicta sunt explicabo Nemo enim ipsam voluptatem.
/helloWorld quia voluluptas sit aspernatur aut oditptas sit aspernatur aut odit aut fugit, sed quia e porro quisquam e.
/helloWorld consequununtur magni dolores eos quitur magni dolores eos qui e porro quisquam e.
/helloWorld voluptatetem accusantium doloremque laudantium,m accusantium doloremque laudantium, totam rem aperiam, eaque ipsa quae ab illo inventore verita.
/helloWorld eaque ipspsa quae ab illo inventorea quae ab illo inventore veritatis et quasieaque ipsa quae ab illo inventore verita.
/helloWorld architectcto beatae vitae dicta sunto beatae vitae dicta sunt explicabo Nemo enim ipsam voluptatem.
/helloWorld quia voluluptas sit aspernatur aut oditptas sit aspernatur aut odit aut fugit, sed quia e porro quisquam e.
/helloWorld consequununtur magni dolores eos qutur magni dolores eos qu.
/helloWorld ratione v voluptatem sequi nesciunt Neque porrooluptatem sequi nesciunt Neque porro quisquam est, qui dolorem ipsum quia dolor sit amet, consectetur, adipisci velit, sed quia non numquam eius modi tempora incidunt ut labore et dolore magnam aliquam quaerat voluptatem.
/helloWorld Ut enim a ad minima veniam, quisd minima veniam, quis nostrum exercitationem ullam corporis suscipit laboriosam, nisi ut aliquid ex ea commodi consequatur? Quis autem vel eum iure reprehenderit qui in ea voluptate velit esse quam nihil molestiae consequatur,.
/helloWorld vel illumum qui dolorem eum fugiat qui dolorem eum fugiat quo voluptas nulla pariatur?.
/helloWorld Sed ut peperspiciatis unde omnis iste natusrspiciatis unde omnis iste natus error site porro quisquam ee porro quisquam e .
/helloWorld But I musust explain to you howt explain to you how all this mistaken idea of denouncing pleasure and praising pain was born and I will give you a complete account of the system, and expound the actual teachings of the great explorer of the truth, the master-builder of human happiness.
/helloWorld No one rerejects, dislikes, orjects, dislikes, or avoids pleasure itself, because it is pleasure, but because those who do not know how to pursue pleasure rationally encounter consequences that are extremely painful.
/helloWorld Nor againin is there anyone who is there anyone who loves or pursues or desires to obtain pain of itself, because it is pain, but because occasionally circumstances occur in which toil and pain can procure him some great pleasure.
/helloWorld To take a a trivial example, which trivial example, which of us ever undertakes laborious physical exercise, except to obtain some advantage from it? But who has any right to find fault with a man who chooses to enjoy a pleasure that has no annoying consequences, or one who avoids a pain that produces no resultant pleasure?.  
`;

interface AsciiElementProps {
  transforms?: (TransformKey | Transform)[];
}

export default function AsciiElement({ transforms = [] }: AsciiElementProps) {
  const [cellMap, setCellMap] = useState<string[][]>([]);
  const [fps, setFps] = useState<number>(0);
  const rows = 40;
  const cols = 100;
  const animationBeginRef = useRef<number | null>(null);
  const lastFrameTimeRef = useRef<number>(0);
  const fpsHistoryRef = useRef<number[]>([]);
  const sentencesRef = useRef<string[]>([]);
  const rafRef = useRef<number | undefined>(undefined);

  useEffect(() => {
    // Initialize sentences
    sentencesRef.current = text
      .split(/[\n\r]/)
      .filter(s => s.length > 0)
      .map(s => s + ' ');

    // Initialize cells
    const initialCells: string[][] = [];
    for (let y = 0; y < rows; y++) {
      initialCells[y] = [];
      for (let x = 0; x < cols; x++) {
        initialCells[y][x] = getCharAt(x, y);
      }
    }
    setCellMap(initialCells);

    // Start animation
    const animate = (time: number) => {
      if (animationBeginRef.current === null) {
        animationBeginRef.current = time;
      }
      
      const delta = time - lastFrameTimeRef.current;
      lastFrameTimeRef.current = time;
      
      if (delta > 0) {
        const currentFps = 1000 / delta;
        fpsHistoryRef.current.push(currentFps);
        if (fpsHistoryRef.current.length > 100) {
          fpsHistoryRef.current.shift();
        }
        const avgFps = fpsHistoryRef.current.reduce((a, b) => a + b, 0) / fpsHistoryRef.current.length;
        setFps(avgFps);
      }
      
      const currentTime = ((time - animationBeginRef.current) / 1000) * 1.5;
      drawText(currentTime);
      rafRef.current = requestAnimationFrame(animate);
    };

    rafRef.current = requestAnimationFrame(animate);

    return () => {
      if (rafRef.current) {
        cancelAnimationFrame(rafRef.current);
      }
    };
  }, [transforms]);

  function getCharAt(x: number, y: number): string {
    const si = y % sentencesRef.current.length;
    const ci = Math.min(x, sentencesRef.current[si].length - 1);
    return sentencesRef.current[si][ci] || ' ';
  }

  function transformer(props: TransformProps): [number, number] {
    const appliedTransforms = transforms.length > 0 ? transforms : [(p: TransformProps): [number, number] => [p.x, p.y]];
    
    return appliedTransforms.reduce(
      (acc, transform) => {
        const resolvedTransform: Transform =
          typeof transform === 'function' ? transform : transformMap[transform];
        return resolvedTransform({ ...props, x: acc[0], y: acc[1] });
      },
      [props.x, props.y]
    );
  }

  function drawText(currentTime: number): void {
    const newMap: string[][] = Array.from({ length: rows }, () =>
      Array(cols).fill(' ')
    );
    
    for (let y = 0; y < rows; y++) {
      for (let x = 0; x < cols; x++) {
        const [nx, ny] = transformer({
          x: x / cols,
          y: y / rows,
          cx: 0.5,
          cy: 0.5,
          time: currentTime,
        });
        const nxInt = Math.floor(nx * cols);
        const nyInt = Math.floor(ny * rows);
        if (nxInt >= 0 && nxInt < cols && nyInt >= 0 && nyInt < rows) {
          newMap[nyInt][nxInt] = getCharAt(x, y);
        }
      }
    }
    setCellMap(newMap);
  }

  return (
    <div className="ascii-container">
      <div className="text-grid">
        {cellMap.map((row, i) => (
          <div key={i} className="row">
            {row.join('')}
          </div>
        ))}
      </div>
      {transforms.length > 0 && (
        <ul className="transforms-list">
          <li className="option">-----</li>
          {transforms.map((transform, i) => (
            <li key={i} className="option">
              {typeof transform === 'function' ? 'custom' : transform}
            </li>
          ))}
          <li className="option">-----</li>
          <li className="option">FPS:</li>
          <li className="option">{fps.toFixed(2)}</li>
          <li className="option">-----</li>
        </ul>
      )}
      <style dangerouslySetInnerHTML={{ __html: `
        .ascii-container {
          display: flex;
          justify-content: center;
          align-items: center;
          font-family: 'JetBrains Mono', monospace;
          font-optical-sizing: auto;
          background-color: rgb(9, 3, 44);
          color: rgb(96, 124, 198);
          zoom: 0.5;
          aspect-ratio: 16 / 9;
          border-radius: 0.5rem;
          overflow: hidden;
          margin: 16px 0;
        }

        .row {
          line-height: 20px;
          display: inline-block;
          white-space: pre;
        }

        .text-grid {
          font-size: 20px;
          overflow: hidden;
          transform: translate(0);
          display: flex;
          flex-direction: column;
        }

        @media (max-width: 768px) {
          .text-grid {
            zoom: 0.6;
          }
        }

        .transforms-list {
          list-style: none;
          margin-right: 8px;
          padding: 0;
        }

        @media (max-width: 768px) {
          .transforms-list {
            zoom: 0.7;
          }
        }

        .option {
          font-size: 24px;
        }

        @media (max-width: 768px) {
          .option {
            font-size: 18px;
          }
        }
      `}} />
    </div>
  );
}