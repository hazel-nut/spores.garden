import { listRecords, deleteRecordByUri } from '../at-client';
import { getCurrentDid, isLoggedIn, createRecord } from '../oauth';
import { getSiteOwnerDid } from '../config';

const SPECIAL_SPORE_COLLECTION = 'garden.spores.item.specialSpore';

export async function renderSpecialSporeDisplay(section) {
  const el = document.createElement('div');
  el.className = 'special-spore-display';

  const visitorDid = getCurrentDid();
  const ownerDid = getSiteOwnerDid();

  // Show content only if owner is set
  if (!ownerDid) {
    el.textContent = 'Garden owner not found.';
    return el;
  }

  try {
    const response = await listRecords(ownerDid, SPECIAL_SPORE_COLLECTION, { limit: 1 });
    const specialSporeRecord = response.records[0];

    if (!specialSporeRecord) {
      el.innerHTML = '<p>No special spore found in this garden.</p>';
      return el;
    }

    const sporeOwnerDid = specialSporeRecord.value.ownerDid;
    
    const sporeEl = document.createElement('div');
    sporeEl.className = 'spore-item';

    const viz = document.createElement('did-visualization');
    viz.setAttribute('did', sporeOwnerDid); // The spore visualization is based on the owner's DID
    sporeEl.appendChild(viz);

    const text = document.createElement('p');
    text.textContent = `This special spore is currently owned by ${sporeOwnerDid}.`;
    sporeEl.appendChild(text);

    // "Steal this spore" button logic
    if (isLoggedIn() && visitorDid && visitorDid !== sporeOwnerDid) {
      const stealBtn = document.createElement('button');
      stealBtn.className = 'button button-primary';
      stealBtn.textContent = 'Steal this spore!';
      stealBtn.addEventListener('click', async () => {
        if (confirm(`Are you sure you want to steal this special spore from ${sporeOwnerDid}?`)) {
          await stealSpore(specialSporeRecord, visitorDid);
          // Re-render the section or page to reflect the change
          window.dispatchEvent(new CustomEvent('config-updated'));
        }
      });
      sporeEl.appendChild(stealBtn);
    } else if (visitorDid === sporeOwnerDid) {
      const ownerText = document.createElement('p');
      ownerText.textContent = 'You currently own this special spore!';
      sporeEl.appendChild(ownerText);
    }
    
    el.appendChild(sporeEl);

  } catch (error) {
    console.error('Failed to load special spore:', error);
    el.textContent = 'Failed to load special spore.';
  }

  return el;
}

async function stealSpore(sporeRecord: any, newOwnerDid: string) {
    const oldOwnerDid = sporeRecord.value.ownerDid;
    const sporeUri = sporeRecord.uri;
    const sporeRkey = sporeUri.split('/').pop();

    // 1. Delete spore from old owner's PDS
    try {
        await deleteRecordByUri(sporeUri);
        // await deleteRecord('garden.spores.item.specialSpore', sporeRkey); // Alternative if using collection/rkey
    } catch (error) {
        console.error('Failed to delete spore from old owner:', error);
        throw new Error('Failed to delete spore from old owner.');
    }

    // 2. Create new spore record in new owner's PDS
    try {
        await createRecord('garden.spores.item.specialSpore', {
            $type: SPECIAL_SPORE_COLLECTION,
            ownerDid: newOwnerDid,
            lastCapturedAt: new Date().toISOString(),
            history: [...sporeRecord.value.history, { did: newOwnerDid, timestamp: new Date().toISOString() }]
        });
    } catch (error) {
        console.error('Failed to create spore for new owner:', error);
        throw new Error('Failed to create spore for new owner.');
    }
    
    alert(`You successfully stole the special spore from ${oldOwnerDid}! It is now yours.`);
}

