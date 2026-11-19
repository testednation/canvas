import './index.css';
import { CanvasCraftStudio } from './studioEngine';

const rootElement = document.getElementById('root');
if (rootElement) {
  new CanvasCraftStudio(rootElement);
}

