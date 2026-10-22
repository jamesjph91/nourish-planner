/* FORGE bootstrap: load the Today visual layer after the original app is ready. */
(()=>{'use strict';
function load(){if(document.querySelector('script[data-forge-today]'))return;const s=document.createElement('script');s.src='./forge-dashboard.js?v=1';s.dataset.forgeToday='1';document.body.appendChild(s)}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',load);else load();
})();