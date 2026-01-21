import { getBacklinks } from '../at-client';
import { getSiteOwnerDid } from '../config';

export async function renderFlowerBed(section) {
  const el = document.createElement('div');
  el.className = 'flower-bed';

  const ownerDid = getSiteOwnerDid();
  if (!ownerDid) {
    el.textContent = 'Could not determine garden owner.';
    return el;
  }

  try {
    const response = await getBacklinks(ownerDid, 'garden.spores.social.flower', { limit: 100 });
    const plantedFlowers = response.links;

    if (plantedFlowers.length === 0) {
      el.innerHTML = '<p>No flowers have been planted in this garden yet.</p>';
      return el;
    }

    const grid = document.createElement('div');
    grid.className = 'flower-grid';
    
    for (const flower of plantedFlowers) {
      const flowerEl = document.createElement('div');
      flowerEl.className = 'flower-grid-item';
      
      const viz = document.createElement('did-visualization');
      viz.setAttribute('did', flower.did);
      flowerEl.appendChild(viz);
      
      grid.appendChild(flowerEl);
    }
    
    el.appendChild(grid);

  } catch (error) {
    console.error('Failed to load flower bed:', error);
    el.textContent = 'Failed to load flower bed.';
  }

  return el;
}