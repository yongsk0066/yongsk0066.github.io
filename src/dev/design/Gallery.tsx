import { useEffect, useState } from "react";
import Playground from "../../components/article/reploom/Playground";

export default function Gallery({
  projects,
}: {
  projects: { id: string; title: string }[];
}) {
  const [id, setId] = useState(projects[0].id);
  const [mounted, setMounted] = useState(false);
  const selected = projects.find((project) => project.id === id)!;

  useEffect(() => setMounted(true), []);

  return (
    <>
      <label className="playground-selector">
        예제 선택{" "}
        <select
          disabled={!mounted}
          value={id}
          onChange={(event) => setId(event.target.value)}
        >
          {projects.map((project) => (
            <option key={project.id} value={project.id}>
              {project.title}
            </option>
          ))}
        </select>
      </label>
      <Playground project={selected.id} title={selected.title} tools />
    </>
  );
}
