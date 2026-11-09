(function () {
  'use strict';

  window.RussiaGlobe = {
    init: function (options) {
      var containerId = options.container;
      var apiUrl = options.apiUrl || '/api';
      var onReady = options.onReady || function () {};
      var container = document.getElementById(containerId);

      if (!container) {
        console.error('RussiaGlobe: container not found:', containerId);
        return;
      }

      // Грузим Three.js, если ещё нет
      if (typeof THREE === 'undefined') {
        var script = document.createElement('script');
        script.src = 'https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js';
        script.onload = function () { loadOrbitControls(container, apiUrl, onReady); };
        script.onerror = function () { console.error('Three.js load failed'); };
        document.head.appendChild(script);
      } else {
        loadOrbitControls(container, apiUrl, onReady);
      }
    }
  };

  function loadOrbitControls(container, apiUrl, onReady) {
    if (typeof THREE.OrbitControls !== 'undefined') {
      return startGlobe(container, apiUrl, onReady);
    }
    var s = document.createElement('script');
    s.src = 'https://cdn.jsdelivr.net/npm/three@0.128.0/examples/js/controls/OrbitControls.js';
    s.onload = function () { startGlobe(container, apiUrl, onReady); };
    s.onerror = function () { console.error('OrbitControls load failed'); };
    document.head.appendChild(s);
  }

  function startGlobe(container, apiUrl, onReady) {
    var width = container.clientWidth;
    var height = container.clientHeight;

    // --- Сцена ---
    var scene = new THREE.Scene();
    var camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 1000);
    camera.position.set(0, 1.5, 7);

    var renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    container.appendChild(renderer.domElement);

    // --- Свет ---
    scene.add(new THREE.AmbientLight(0xffffff, 0.55));
    var dirLight = new THREE.DirectionalLight(0xffffff, 0.9);
    dirLight.position.set(5, 3, 5);
    scene.add(dirLight);

    // --- Глобус ---
    var RADIUS = 2;
    var globeGeo = new THREE.SphereGeometry(RADIUS, 64, 64);
    var globeMat = new THREE.MeshPhongMaterial({
      color: 0x1a1a2e,
      shininess: 10,
      specular: 0x222222
    });
    var globe = new THREE.Mesh(globeGeo, globeMat);
    scene.add(globe);

    // Лёгкая атмосфера (светящийся ореол)
    var atmosphereGeo = new THREE.SphereGeometry(RADIUS * 1.03, 64, 64);
    var atmosphereMat = new THREE.MeshBasicMaterial({
      color: 0x3355ff,
      transparent: true,
      opacity: 0.08,
      side: THREE.BackSide
    });
    scene.add(new THREE.Mesh(atmosphereGeo, atmosphereMat));

    // --- Controls ---
    var controls = new THREE.OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.06;
    controls.autoRotate = true;
    controls.autoRotateSpeed = 0.6;
    controls.minDistance = 3.5;
    controls.maxDistance = 12;
    controls.enablePan = false;

    // --- lat/lon → 3D ---
    function latLonToVector3(lat, lon, radius) {
      var phi = (90 - lat) * (Math.PI / 180);
      var theta = (lon + 180) * (Math.PI / 180);
      return new THREE.Vector3(
        -radius * Math.sin(phi) * Math.cos(theta),
         radius * Math.cos(phi),
         radius * Math.sin(phi) * Math.sin(theta)
      );
    }

    // --- Границы ---
    var borderGroup = new THREE.Group();
    scene.add(borderGroup);

    fetch(apiUrl + '/borders')
      .then(function (r) { return r.json(); })
      .then(function (geojson) {
        drawBorders(geojson);
        onReady();
      })
      .catch(function (err) {
        console.warn('Borders load failed:', err);
        onReady(); // всё равно показываем глобус
      });

    function drawBorders(geojson) {
      var lineMat = new THREE.LineBasicMaterial({
        color: 0xff3333,
        transparent: true,
        opacity: 0.85
      });

      geojson.features.forEach(function (feature) {
        var geom = feature.geometry;
        if (!geom) return;

        var rings = [];
        if (geom.type === 'Polygon') {
          rings = [geom.coordinates[0]];
        } else if (geom.type === 'MultiPolygon') {
          rings = geom.coordinates.map(function (p) { return p[0]; });
        }

        rings.forEach(function (ring) {
          if (!ring || ring.length < 3) return;
          var points = ring.map(function (c) {
            return latLonToVector3(c[1], c[0], RADIUS + 0.005);
          });
          var g = new THREE.BufferGeometry().setFromPoints(points);
          borderGroup.add(new THREE.Line(g, lineMat));
        });
      });
    }

    // --- Маркеры городов ---
    var markerGroup = new THREE.Group();
    scene.add(markerGroup);
    var markerMat = new THREE.MeshBasicMaterial({ color: 0xffaa00 });
    var markerGeo = new THREE.SphereGeometry(0.035, 8, 8);

    fetch(apiUrl + '/cities')
      .then(function (r) { return r.json(); })
      .then(function (cities) {
        cities.forEach(function (c) {
          var pos = latLonToVector3(c.lat, c.lon, RADIUS + 0.02);
          var m = new THREE.Mesh(markerGeo, markerMat);
          m.position.copy(pos);
          markerGroup.add(m);
        });
      })
      .catch(function (err) { console.warn('Cities load failed:', err); });

    // --- Анимация ---
    function animate() {
      requestAnimationFrame(animate);
      controls.update();
      renderer.render(scene, camera);
    }
    animate();

    // --- Ресайз ---
    window.addEventListener('resize', function () {
      var w = container.clientWidth;
      var h = container.clientHeight;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    });
  }
})();
