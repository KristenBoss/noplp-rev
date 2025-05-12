// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyDEQhWdDnALsSmfwilaanAXEgn6eNkWCow",
  authDomain: "noplp-kb.firebaseapp.com",
  projectId: "noplp-kb",
  storageBucket: "noplp-kb.firebasestorage.app",
  messagingSenderId: "168319535605",
  appId: "1:168319535605:web:2533c466da1e1cac55f8bc"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

firebase.initializeApp(firebaseConfig);
const auth = firebase.auth();
const db = firebase.firestore();
let userId = null;

auth.signInAnonymously().then(cred => {
  userId = cred.user.uid;
  document.getElementById("user-status").textContent = "Connecté";
  loadSongs();
});

async function addSong() {
  const title = document.getElementById("title").value;
  const artist = document.getElementById("artist").value;
  const lyrics = document.getElementById("lyrics").value;
  if (!title || !artist || !lyrics) return alert("Champs manquants");

  await db.collection("users").doc(userId).collection("songs").add({
    title, artist, lyrics, progress: 0, status: "Non apprise"
  });

  loadSongs();
}

async function loadSongs() {
  const list = document.getElementById("songs");
  list.innerHTML = "";
  const snapshot = await db.collection("users").doc(userId).collection("songs").get();
  snapshot.forEach(doc => {
    const song = doc.data();
    const li = document.createElement("li");
    li.innerHTML = `
      <strong>${song.title}</strong> - ${song.artist} (${song.status}) 
      <button onclick="train('${doc.id}')">S'entraîner</button>
      <button onclick="deleteSong('${doc.id}')">Supprimer</button>`;
    list.appendChild(li);
  });
}

async function deleteSong(id) {
  await db.collection("users").doc(userId).collection("songs").doc(id).delete();
  loadSongs();
}

async function train(songId) {
  const doc = await db.collection("users").doc(userId).collection("songs").doc(songId).get();
  const { title, lyrics } = doc.data();
  document.getElementById("training").classList.remove("hidden");
  document.getElementById("lyrics-area").innerHTML = "";

  const percent = parseInt(document.getElementById("maskPercent").value);
  const words = lyrics.split(/\s+/);
  const totalToHide = Math.floor(words.length * percent / 100);
  const indices = new Set();
  while (indices.size < totalToHide) indices.add(Math.floor(Math.random() * words.length));

  words.forEach((word, i) => {
    const span = document.createElement("span");
    if (indices.has(i)) {
      span.className = "hidden-word";
      span.contentEditable = true;
    } else {
      span.textContent = word;
    }
    document.getElementById("lyrics-area").appendChild(span);
    document.getElementById("lyrics-area").append(" ");
  });

  window.currentTraining = { songId, words, indices };
}

async function validate() {
  const spans = document.querySelectorAll("#lyrics-area .hidden-word");
  const { words, indices, songId } = window.currentTraining;
  let correct = 0;
  spans.forEach((span, i) => {
    const entered = span.textContent.trim().toLowerCase();
    const original = words[Array.from(indices)[i]].toLowerCase();
    if (entered === original) correct++;
  });

  const score = correct / spans.length;
  let status = "Non apprise";
  if (score > 0.8) status = "Apprise";
  else if (score > 0.5) status = "En cours";

  await db.collection("users").doc(userId).collection("songs").doc(songId).update({
    progress: Math.round(score * 100),
    status
  });

  alert(`Résultat : ${Math.round(score * 100)}% => ${status}`);
  loadSongs();
}