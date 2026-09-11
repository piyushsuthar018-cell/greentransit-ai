/**
 * GreenTransit AI - Client Application Logic
 * Supports Origin-Destination journey comparison, passenger-based pricing, and clean chat
 */

document.addEventListener('DOMContentLoaded', () => {
  // Journey Bar Elements
  const journeyForm = document.getElementById('journey-form');
  const inputOrigin = document.getElementById('input-origin');
  const inputDestination = document.getElementById('input-destination');
  const selectPassengers = document.getElementById('select-passengers');
  const swapBtn = document.getElementById('swap-locations-btn');

  // Chat Elements
  const chatForm = document.getElementById('chat-form');
  const chatInput = document.getElementById('chat-input');
  const chatMessages = document.getElementById('chat-messages');
  const sendBtn = document.getElementById('send-btn');
  const quickPrompts = document.getElementById('quick-prompts');
  const initialChips = document.getElementById('initial-chips');

  // Modal Elements
  const evaluatorInfoBtn = document.getElementById('evaluator-info-btn');
  const evaluatorModal = document.getElementById('evaluator-modal');
  const modalCloseBtn = document.getElementById('modal-close-btn');
  const runApiTestBtn = document.getElementById('run-api-test-btn');
  const testOutput = document.getElementById('test-output');

  // Maintain persistent conversation session for multi-turn conversational memory
  let currentSessionId = sessionStorage.getItem('greentransit_session_id');
  if (!currentSessionId) {
    currentSessionId = 'session_' + Date.now() + '_' + Math.random().toString(36).substring(2, 9);
    sessionStorage.setItem('greentransit_session_id', currentSessionId);
  }

  let isSending = false;

  /**
   * Swap origin and destination inputs
   */
  if (swapBtn) {
    swapBtn.addEventListener('click', () => {
      const temp = inputOrigin.value;
      inputOrigin.value = inputDestination.value;
      inputDestination.value = temp;
    });
  }

  /**
   * Simple markdown parser
   */
  function renderMarkdown(md) {
    if (!md) return '';
    let html = md;

    html = html.replace(/^### (.*$)/gim, '<h3>$1</h3>');
    html = html.replace(/^#### (.*$)/gim, '<h4>$1</h4>');
    html = html.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
    html = html.replace(/\*(.*?)\*/g, '<em>$1</em>');
    html = html.replace(/^\> (.*$)/gim, '<blockquote>$1</blockquote>');
    html = html.replace(/^\-\-\-$/gim, '<hr>');

    // Tables
    if (html.includes('|')) {
      const lines = html.split('\n');
      let inTable = false;
      let tableHtml = '<table>';
      const outputLines = [];

      for (let line of lines) {
        const trimmed = line.trim();
        if (trimmed.startsWith('|') && trimmed.endsWith('|')) {
          if (trimmed.includes('---')) continue;
          const cells = trimmed.slice(1, -1).split('|').map(c => c.trim());
          if (!inTable) {
            inTable = true;
            tableHtml += '<thead><tr>' + cells.map(c => `<th>${c}</th>`).join('') + '</tr></thead><tbody>';
          } else {
            tableHtml += '<tr>' + cells.map(c => `<td>${c}</td>`).join('') + '</tr>';
          }
        } else {
          if (inTable) {
            inTable = false;
            tableHtml += '</tbody></table>';
            outputLines.push(tableHtml);
          }
          outputLines.push(line);
        }
      }
      if (inTable) {
        tableHtml += '</tbody></table>';
        outputLines.push(tableHtml);
      }
      html = outputLines.join('\n');
    }

    // Unordered lists
    html = html.replace(/^\s*-\s+(.*$)/gim, '<li>$1</li>');
    html = html.replace(/(<li>.*<\/li>)/gims, '<ul>$1</ul>');

    // Paragraphs
    html = html.split('\n\n').map(para => {
      const trimmed = para.trim();
      if (!trimmed.startsWith('<h') && !trimmed.startsWith('<table') && !trimmed.startsWith('<ul') && !trimmed.startsWith('<block') && !trimmed.startsWith('<hr')) {
        return `<p>${trimmed.replace(/\n/g, '<br>')}</p>`;
      }
      return trimmed;
    }).join('');

    return html;
  }

  function scrollToBottom() {
    chatMessages.scrollTop = chatMessages.scrollHeight;
  }

  /**
   * Build visual route comparison cards
   */
  function createRouteCardsHtml(routeData) {
    if (!routeData || !routeData.options) return '';

    const p = routeData.passengers;
    let headerInfo = '';
    if (routeData.corridor) {
      const metroStatus = routeData.metroFeasible 
        ? '<span style="color: #34d399;">✅ Metro Feasible & Close</span>' 
        : '<span style="color: #fbbf24;">⚠️ Metro Not Close (Bus / Direct Road Recommended)</span>';
      headerInfo = `<div style="font-size: 0.78rem; color: #cbd5e1; background: rgba(0,0,0,0.3); padding: 6px 12px; border-radius: 6px; margin: 8px 0; border: 1px solid rgba(255,255,255,0.06);">📍 <strong>Corridor:</strong> ${routeData.corridor} (~${routeData.distanceKm} km) &nbsp;|&nbsp; 🚇 <strong>Rail Status:</strong> ${metroStatus}</div>`;
    }

    let cardsHtml = headerInfo + '<div class="route-cards-deck">';

    routeData.options.forEach(opt => {
      let cardClass = 'route-card';
      let tagClass = 'card-tag';
      if (opt.name.includes('Hybrid') || opt.name.includes('Metro')) {
        cardClass += ' eco-winner';
        tagClass += ' tag-eco';
      } else if (opt.name.includes('Bus') || opt.name.includes('Transit')) {
        cardClass += ' eco-winner';
        tagClass += ' tag-eco';
      } else if (opt.name.includes('Auto')) {
        cardClass += ' auto-card';
        tagClass += ' tag-shared';
      } else if (opt.name.includes('Uber') || opt.name.includes('Cab')) {
        cardClass += ' cab-card';
        tagClass += ' tag-cab';
      } else if (opt.name.includes('Rapido') || opt.name.includes('Bike')) {
        cardClass += ' bike-card';
        tagClass += ' tag-bike';
      }

      const priceDisplay = opt.perPerson != null ? `₹${opt.perPerson}` : 'N/A';
      const totalDisplay = opt.total != null ? `Total ₹${opt.total} (${p} ${p > 1 ? 'people' : 'person'})` : opt.tag;

      cardsHtml += `
        <div class="${cardClass}">
          <span class="${tagClass}">${opt.tag}</span>
          <div class="card-title">${opt.name}</div>
          <div class="card-price-row">
            <span class="card-price-main">${priceDisplay}</span>
            <span class="card-price-unit">${opt.perPerson != null ? '/ person' : ''}</span>
          </div>
          <div class="card-meta-row">
            <span>⏱️ ${opt.time}</span>
            <span>🌱 ${opt.co2} kg CO2</span>
          </div>
          <div style="font-size: 0.7rem; color: #94a3b8; margin-top: 2px;">
            ${totalDisplay}
          </div>
        </div>
      `;
    });

    cardsHtml += '</div>';

    if (routeData.googleMapsUrl) {
      cardsHtml += `
        <div style="margin-top: 8px; display: flex; justify-content: flex-end;">
          <a href="${routeData.googleMapsUrl}" target="_blank" rel="noopener noreferrer" class="chip" style="text-decoration: none; display: inline-flex; align-items: center; gap: 6px; background: rgba(6, 182, 212, 0.15); border-color: rgba(6, 182, 212, 0.35); color: #67e8f9; font-weight: 600;">
            🗺️ View Real-Time Route on Google Maps ↗
          </a>
        </div>
      `;
    }

    return cardsHtml;
  }

  /**
   * Append a message bubble
   */
  function appendMessage(role, text, actionChips = [], carbonSaved = 0, routeData = null) {
    const row = document.createElement('div');
    row.className = `msg-row ${role}-row`;

    const avatar = document.createElement('div');
    avatar.className = 'msg-avatar';
    avatar.textContent = role === 'user' ? 'YOU' : '🌱';

    const body = document.createElement('div');
    body.className = `msg-body ${role}-body`;

    if (role === 'bot') {
      let badgeHtml = '';
      if (carbonSaved > 0) {
        badgeHtml = `<div class="route-header-pill">🌱 Saves ${carbonSaved} kg CO2 vs Driving Solo</div>`;
      }

      // Visual cards if available
      let visualCardsHtml = '';
      if (routeData) {
        visualCardsHtml = createRouteCardsHtml(routeData);
      }

      body.innerHTML = badgeHtml + visualCardsHtml + renderMarkdown(text);

      // Action chips
      if (actionChips && actionChips.length > 0) {
        const chipsContainer = document.createElement('div');
        chipsContainer.className = 'chips-tray';
        actionChips.forEach(chipText => {
          const btn = document.createElement('button');
          btn.className = 'chip';
          btn.textContent = chipText;
          btn.addEventListener('click', () => {
            sendUserMessage(chipText);
          });
          chipsContainer.appendChild(btn);
        });
        body.appendChild(chipsContainer);
      }
    } else {
      body.textContent = text;
    }

    row.appendChild(avatar);
    row.appendChild(body);
    chatMessages.appendChild(row);
    scrollToBottom();
  }

  function showTypingIndicator() {
    const row = document.createElement('div');
    row.className = 'msg-row bot-row';
    row.id = 'typing-indicator-row';

    const avatar = document.createElement('div');
    avatar.className = 'msg-avatar';
    avatar.textContent = '🌱';

    const body = document.createElement('div');
    body.className = 'msg-body bot-body';
    body.innerHTML = `
      <div class="typing-dots">
        <span class="typing-dot"></span>
        <span class="typing-dot"></span>
        <span class="typing-dot"></span>
      </div>
    `;

    row.appendChild(avatar);
    row.appendChild(body);
    chatMessages.appendChild(row);
    scrollToBottom();
  }

  function removeTypingIndicator() {
    const el = document.getElementById('typing-indicator-row');
    if (el) el.remove();
  }

  /**
   * Send message to POST /chat evaluator endpoint
   */
  async function sendUserMessage(messageText) {
    const text = (messageText || '').trim();
    if (!text || isSending) return;

    isSending = true;
    chatInput.value = '';
    sendBtn.disabled = true;

    appendMessage('user', text);
    showTypingIndicator();

    try {
      const response = await fetch('/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: text, sessionId: currentSessionId })
      });

      const data = await response.json();
      if (data && data.sessionId) {
        currentSessionId = data.sessionId;
        sessionStorage.setItem('greentransit_session_id', currentSessionId);
      }
      removeTypingIndicator();

      const replyText = data.response || data.message || data.reply || "GreenTransit AI response received.";
      appendMessage('bot', replyText, data.action_chips, data.carbon_saved_kg, data.route_data);
    } catch (err) {
      removeTypingIndicator();
      appendMessage('bot', "⚠️ Error connecting to GreenTransit AI. Please ensure the server is running.");
      console.error(err);
    } finally {
      isSending = false;
      sendBtn.disabled = false;
      chatInput.focus();
    }
  }

  // Journey Form Submission
  journeyForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const origin = inputOrigin.value.trim();
    const dest = inputDestination.value.trim();
    const passengers = selectPassengers.value;

    if (!origin || !dest) return;
    const query = `From ${origin} to ${dest} for ${passengers} ${parseInt(passengers, 10) > 1 ? 'people' : 'person'}`;
    sendUserMessage(query);
  });

  // Chat Input Submission
  chatForm.addEventListener('submit', (e) => {
    e.preventDefault();
    sendUserMessage(chatInput.value);
  });

  // Handle Initial Chips
  if (initialChips) {
    initialChips.addEventListener('click', (e) => {
      const btn = e.target.closest('.chip');
      if (btn && btn.dataset.query) {
        sendUserMessage(btn.dataset.query);
      }
    });
  }

  // Handle Quick Prompts
  if (quickPrompts) {
    quickPrompts.addEventListener('click', (e) => {
      const btn = e.target.closest('.quick-chip');
      if (btn && btn.dataset.query) {
        sendUserMessage(btn.dataset.query);
      }
    });
  }

  // Modal handlers
  evaluatorInfoBtn.addEventListener('click', () => {
    evaluatorModal.classList.add('active');
  });

  modalCloseBtn.addEventListener('click', () => {
    evaluatorModal.classList.remove('active');
  });

  evaluatorModal.addEventListener('click', (e) => {
    if (e.target === evaluatorModal) evaluatorModal.classList.remove('active');
  });

  runApiTestBtn.addEventListener('click', async () => {
    testOutput.textContent = "Executing POST /chat with sample message...";
    try {
      const start = performance.now();
      const res = await fetch('/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: "From Silver Oak to Rabari Colony for 2 people" })
      });
      const duration = Math.round(performance.now() - start);
      const json = await res.json();
      testOutput.textContent = `Status: ${res.status} OK (${duration}ms)\nHeaders: Content-Type: application/json\n\n` + JSON.stringify(json, null, 2);
    } catch (err) {
      testOutput.textContent = `Error: ${err.message}`;
    }
  });
});
