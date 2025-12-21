import { useState, useEffect, useCallback } from 'react';
import { 
  getSlotElements, 
  emitPluginEvent, 
  getPluginState, 
  setPluginState,
  broadcastEvent 
} from '../utils/pluginUIRegistry';

/**
 * Hook für Plugin-Slot Integration in Komponenten
 * 
 * Ermöglicht einfache Integration von Plugin-UI in bestehende Komponenten
 * ohne die Komponente selbst ändern zu müssen.
 * 
 * @param {string} slot - Der Slot-Name
 * @returns {object} - Slot-Daten und Hilfsfunktionen
 */
export const usePluginSlot = (slot) => {
  const [elements, setElements] = useState([]);
  const [states, setStates] = useState({});

  // Elemente und States laden
  useEffect(() => {
    const loadElements = () => {
      const slotElements = getSlotElements(slot);
      setElements(slotElements);
      
      // States laden
      const newStates = {};
      slotElements.forEach(el => {
        if (el.stateKey) {
          const state = getPluginState(el.pluginId, el.stateKey);
          newStates[`${el.pluginId}:${el.stateKey}`] = state;
        }
      });
      setStates(newStates);
    };

    loadElements();

    // Auf Updates hören
    const handleUpdate = (e) => {
      if (e.detail.slot === slot) {
        loadElements();
      }
    };

    const handleStateChange = (e) => {
      const { pluginId, key, value } = e.detail;
      setStates(prev => ({
        ...prev,
        [`${pluginId}:${key}`]: value
      }));
    };

    window.addEventListener('plugin-slot-update', handleUpdate);
    window.addEventListener('plugin-state-change', handleStateChange);

    return () => {
      window.removeEventListener('plugin-slot-update', handleUpdate);
      window.removeEventListener('plugin-state-change', handleStateChange);
    };
  }, [slot]);

  // State für ein Element abrufen
  const getState = useCallback((pluginId, stateKey) => {
    return states[`${pluginId}:${stateKey}`];
  }, [states]);

  // State setzen
  const setState = useCallback((pluginId, stateKey, value) => {
    setPluginState(pluginId, stateKey, value);
  }, []);

  // Event an Plugin senden
  const sendEvent = useCallback((pluginId, eventType, data) => {
    return emitPluginEvent(pluginId, eventType, data);
  }, []);

  // Prüfen ob ein bestimmtes Feature aktiv ist
  const isFeatureActive = useCallback((stateKey) => {
    for (const el of elements) {
      if (el.stateKey === stateKey) {
        const state = getPluginState(el.pluginId, el.stateKey);
        if (state) return true;
      }
    }
    return false;
  }, [elements]);

  return {
    elements,
    states,
    hasElements: elements.length > 0,
    getState,
    setState,
    sendEvent,
    isFeatureActive,
  };
};

/**
 * Hook für Plugin-Events
 * 
 * Ermöglicht Komponenten auf Plugin-Events zu reagieren
 * 
 * @param {string} eventType - Der Event-Typ auf den gehört werden soll
 * @param {function} handler - Der Event-Handler
 */
export const usePluginEvent = (eventType, handler) => {
  useEffect(() => {
    const handleEvent = (e) => {
      if (e.detail.eventType === eventType || eventType === '*') {
        handler(e.detail);
      }
    };

    // Auf alle Plugin-Events hören
    const eventHandler = (e) => {
      if (e.type.startsWith('plugin-event:')) {
        handleEvent(e);
      }
    };

    // Spezifische Events
    window.addEventListener(`plugin-${eventType}`, handler);
    
    // Generische Plugin-Events
    const allPluginEvents = (e) => {
      if (e.type.startsWith('plugin-event:')) {
        const detail = e.detail;
        if (detail.eventType === eventType || eventType === '*') {
          handler(detail.data);
        }
      }
    };

    // Capture all custom events
    window.addEventListener('plugin-status', (e) => {
      if (eventType === 'status' || eventType === '*') handler(e.detail);
    });
    window.addEventListener('plugin-set-input', (e) => {
      if (eventType === 'set-input' || eventType === '*') handler(e.detail);
    });
    window.addEventListener('plugin-send-message', (e) => {
      if (eventType === 'send-message' || eventType === '*') handler(e.detail);
    });
    window.addEventListener('plugin-notify', (e) => {
      if (eventType === 'notify' || eventType === '*') handler(e.detail);
    });

    return () => {
      window.removeEventListener(`plugin-${eventType}`, handler);
      window.removeEventListener('plugin-status', handler);
      window.removeEventListener('plugin-set-input', handler);
      window.removeEventListener('plugin-send-message', handler);
      window.removeEventListener('plugin-notify', handler);
    };
  }, [eventType, handler]);
};

/**
 * Hook für Plugin-State Synchronisation
 * 
 * Synchronisiert einen lokalen State mit einem Plugin-State
 * 
 * @param {string} pluginId - Die Plugin-ID
 * @param {string} stateKey - Der State-Key
 * @param {any} defaultValue - Der Default-Wert
 * @returns {[any, function]} - [state, setState]
 */
export const usePluginState = (pluginId, stateKey, defaultValue = false) => {
  const [value, setValue] = useState(() => {
    const saved = getPluginState(pluginId, stateKey);
    return saved !== undefined ? saved : defaultValue;
  });

  useEffect(() => {
    const handleChange = (e) => {
      if (e.detail.pluginId === pluginId && e.detail.key === stateKey) {
        setValue(e.detail.value);
      }
    };

    window.addEventListener('plugin-state-change', handleChange);
    return () => window.removeEventListener('plugin-state-change', handleChange);
  }, [pluginId, stateKey]);

  const setStateValue = useCallback((newValue) => {
    setValue(newValue);
    setPluginState(pluginId, stateKey, newValue);
  }, [pluginId, stateKey]);

  return [value, setStateValue];
};

export default usePluginSlot;
