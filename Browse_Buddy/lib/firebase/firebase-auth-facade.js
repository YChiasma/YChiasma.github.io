class User {
  constructor(idToken, refreshToken, localId) {
    this._idToken = idToken;
    this._refreshToken = refreshToken;
    this._localId = localId;
  }

  getIdToken() {
    return this._idToken;
  }

  getUserId() {
    return this._localId;
  }

  getRefreshToken() {
    return this._refreshToken;
  }
}

class Auth {
  constructor(apiKey) {
    this.apiKey = apiKey;
    this.currentUser = null;
  }

  async signInAnonymously() {
    const url = `https://identitytoolkit.googleapis.com/v1/accounts:signUp?key=${this.apiKey}`;
    
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ returnSecureToken: true })
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(`Authentication failed: ${error.error.message}`);
    }

    const data = await response.json();
    this.currentUser = new User(data.idToken, data.refreshToken, data.localId);
    return this.currentUser;
  }
}

class Firebase {
  initializeApp(firebaseConfig) {
    if (!firebaseConfig.apiKey) {
      throw new Error("Firebase config must include 'apiKey'");
    }
    this.config = firebaseConfig;
  }

  auth() {
    if (!this.config) {
      throw new Error("Firebase must be initialized first.");
    }
    return new Auth(this.config.apiKey);
  }
}

const firebase = new Firebase();