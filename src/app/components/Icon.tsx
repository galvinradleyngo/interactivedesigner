const P: Record<string, string> = {
  plus: 'M12 5v14M5 12h14',
  text: 'M5 6V4h14v2M12 4v16M9 20h6',
  image: 'M4 5h16v14H4zM4 16l5-5 4 4 3-3 4 4M9 9.5h.01',
  shape: 'M4 4h9v9H4zM15 11a5 5 0 1 0 0 .01',
  button: 'M4 8h16v8H4zM8 12h8',
  hotspot: 'M12 21s-6-5.5-6-10a6 6 0 0 1 12 0c0 4.5-6 10-6 10zM12 11h.01',
  dragdrop: 'M4 4h7v7H4zM13 13h7v7h-7zM14 5l5 0M17 2l3 3-3 3',
  cards: 'M7 7h13v10H7zM4 10v9h13M11 12h5',
  compare: 'M3 5h18v14H3zM12 5v14M9 10l-3 2 3 2M15 10l3 2-3 2',
  quiz: 'M4 5h16v14H4zM8 10h8M8 14h5',
  undo: 'M9 14L4 9l5-5M4 9h10a6 6 0 0 1 0 12h-3',
  redo: 'M15 14l5-5-5-5M20 9H10a6 6 0 0 0 0 12h3',
  trash: 'M4 7h16M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3',
  copy: 'M8 8h12v12H8zM4 16V4h12',
  up: 'M12 19V5M6 11l6-6 6 6',
  down: 'M12 5v14M6 13l6 6 6-6',
  eye: 'M2 12s4-7 10-7 10 7 10 7-4 7-10 7S2 12 2 12zM12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6z',
  eyeoff:
    'M3 3l18 18M10 6a9 9 0 0 1 12 6 12 12 0 0 1-3 4M6 8a12 12 0 0 0-4 4s4 7 10 7a9 9 0 0 0 4-1',
  lock: 'M6 11h12v9H6zM8 11V8a4 4 0 0 1 8 0v3',
  unlock: 'M6 11h12v9H6zM8 11V8a4 4 0 0 1 7-2',
  play: 'M7 4l13 8-13 8z',
  download: 'M12 4v11M7 11l5 5 5-5M5 20h14',
  back: 'M15 5l-7 7 7 7',
  layers: 'M12 3l9 5-9 5-9-5zM3 13l9 5 9-5',
  page: 'M6 3h9l4 4v14H6zM15 3v4h4',
  settings:
    'M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6zM19 12a7 7 0 0 0-.1-1.2l2-1.5-2-3.4-2.3.9a7 7 0 0 0-2-1.2L14 3h-4l-.6 2.6a7 7 0 0 0-2 1.2l-2.3-.9-2 3.4 2 1.5a7 7 0 0 0 0 2.4l-2 1.5 2 3.4 2.3-.9a7 7 0 0 0 2 1.2L10 21h4l.6-2.6a7 7 0 0 0 2-1.2l2.3.9 2-3.4-2-1.5c.1-.4.1-.8.1-1.2z',
  zoomin: 'M11 4a7 7 0 1 0 0 14 7 7 0 0 0 0-14zM20 20l-4-4M11 8v6M8 11h6',
  zoomout: 'M11 4a7 7 0 1 0 0 14 7 7 0 0 0 0-14zM20 20l-4-4M8 11h6',
  close: 'M6 6l12 12M18 6L6 18',
  check: 'M5 12l5 5 9-10',
  folder: 'M3 6h6l2 2h10v11H3z',
  upload: 'M12 16V5M7 9l5-5 5 5M5 20h14',
  alignleft: 'M4 4v16M8 7h12M8 17h8',
  aligncenter: 'M12 4v16M5 7h14M8 17h8',
  alignright: 'M20 4v16M4 7h12M8 17h8',
  aligntop: 'M4 4h16M7 8v12M17 8v8',
  alignmiddle: 'M4 12h16M7 5v14M17 8v8',
  alignbottom: 'M4 20h16M7 4v12M17 8v8',
  front: 'M8 8h12v12H8zM4 4h8v4',
  back2: 'M4 4h12v12H4zM12 20h8v-8',
  phone: 'M8 3h8a1 1 0 0 1 1 1v16a1 1 0 0 1-1 1H8a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1zM11 18h2',
  tablet: 'M5 3h14a1 1 0 0 1 1 1v16a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1zM11 18h2',
  desktop: 'M3 4h18v12H3zM8 20h8M12 16v4',
  rotate: 'M4 12a8 8 0 0 1 14-5l2 2M20 4v5h-5M20 12a8 8 0 0 1-14 5l-2-2M4 20v-5h5',
  warn: 'M12 3l10 18H2zM12 10v5M12 18h.01',
  flip: 'M5 5h6v14H5zM13 8l6-3v14l-6-3zM12 3v18',
  timeline: 'M3 12h18M6 12V7M12 12v5M18 12V7M6 5h.01M12 19h.01M18 5h.01',
  edit: 'M4 20l4-1 11-11-3-3L5 16zM14 6l3 3',
};

export function Icon({ name, size = 18 }: { name: string; size?: number }) {
  return (
    <svg
      className="icon"
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
    >
      <path d={P[name] ?? P.plus} />
    </svg>
  );
}
