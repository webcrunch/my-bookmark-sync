import { Injectable, signal } from '@angular/core';

// Samma inloggning som admin på jarllindquist.com (magisk länk via Telegram), men som eget
// system: app "bookmarks". Telegram-meddelandet säger Bokmärken, och sessionen gäller bara här,
// så den sparas under egna nycklar och inte under admins (samma domän).
const APP = 'bookmarks';
const SESSION_KEY = 'bookmarks_session_id';
const FLAG_KEY = 'bookmarks_authenticated';
const EXPIRES_KEY = 'bookmarks_expires_at';
const TIMEOUT_MS = 15 * 60 * 1000; // n8n förnyar sessionen 15 minuter vid varje anrop
const N8N = 'https://jarllindquist.com/n8n/webhook';

const storage = {
  get: (key: string) => {
    try { return localStorage.getItem(key) || ''; } catch { return ''; }
  },
  set: (key: string, value: string) => {
    try { localStorage.setItem(key, value); } catch { /* blockerat: bara den här fliken */ }
  },
  remove: (key: string) => {
    try { localStorage.removeItem(key); } catch { /* ingenting att ta bort */ }
  }
};

@Injectable({ providedIn: 'root' })
export class AuthService {
  loggedIn = signal(this.hasValidSession());
  waiting = signal(false);
  message = signal('');
  private poll?: ReturnType<typeof setInterval>;

  session(): string {
    return storage.get(SESSION_KEY);
  }

  // Varje godkänt anrop till n8n förlänger sessionen där; samma sak här.
  touch() {
    storage.set(EXPIRES_KEY, String(Date.now() + TIMEOUT_MS));
  }

  async startLogin() {
    if (this.waiting()) return;
    this.message.set('Skickar länk till Telegram...');
    try {
      const res = await fetch(`${N8N}/request-magic-link`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ app: APP })
      });
      // n8n skickar högst en länk i minuten
      if (res.status === 429) {
        this.message.set('En länk skickades nyss. Vänta en minut och försök igen.');
        return;
      }
      const data = await res.json();
      if (!data?.sessionId) throw new Error('no sessionId');

      this.waiting.set(true);
      this.message.set('Klicka på länken som skickades till din Telegram.');
      clearInterval(this.poll);
      this.poll = setInterval(() => this.checkApproval(data.sessionId), 2000);
    } catch {
      this.message.set('Kunde inte skicka länken. Försök igen om en stund.');
    }
  }

  cancelLogin() {
    clearInterval(this.poll);
    this.waiting.set(false);
    this.message.set('');
  }

  logout(message = '') {
    clearInterval(this.poll);
    [SESSION_KEY, FLAG_KEY, EXPIRES_KEY].forEach(storage.remove);
    this.waiting.set(false);
    this.loggedIn.set(false);
    this.message.set(message);
  }

  // n8n svarade 401: sessionen har gått ut eller finns inte
  sessionExpired() {
    if (this.loggedIn()) this.logout('Sessionen har gått ut. Logga in igen.');
  }

  private async checkApproval(sessionId: string) {
    try {
      const res = await fetch(`${N8N}/check-login-status`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId })
      });
      const data = await res.json();
      if (data?.authenticated !== true) return;

      clearInterval(this.poll);
      storage.set(SESSION_KEY, sessionId);
      storage.set(FLAG_KEY, 'true');
      this.touch();
      this.waiting.set(false);
      this.message.set('');
      this.loggedIn.set(true);
    } catch {
      // Nätverket hackar: nästa kontroll om två sekunder
    }
  }

  private hasValidSession(): boolean {
    const expires = parseInt(storage.get(EXPIRES_KEY) || '0', 10);
    return !!storage.get(SESSION_KEY) && Date.now() < expires;
  }
}
