import { createRoot } from 'react-dom/client';
import MatrixEditor from '../../app/editor/page';
import '../../app/globals.css';

// Mount the existing browser-only editor, preserving all geometry, controls,
// exports and origin-scoped saved projects. No replacement editor is introduced.
const element = document.getElementById('matrix-root');
if (!element) throw new Error('Matrix mount element is missing');
createRoot(element).render(<MatrixEditor />);
