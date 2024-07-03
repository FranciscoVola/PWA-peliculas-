const apiKey = '757e212';
let db; //variable de la base de datos

document.addEventListener('DOMContentLoaded', () => {
    const btnBuscar = document.querySelector('#btn-buscar');
    const resultadoDiv = document.querySelector('#resultado-lista');
    const backButton = document.getElementById('volver');
    const addButton = document.getElementById('agregar-favoritos');
    const removeButton = document.getElementById('eliminar-favoritos');
    let peliculaActual = null;

    // aca inicio INDEXDB//
    const request = indexedDB.open('FavoritosDB', 1);

    request.onerror = function(event) {
        console.error('Error al abrir IndexedDB:', event);
    };

    request.onsuccess = function(event) {
        db = event.target.result;
        cargarFavoritos();
    };

    request.onupgradeneeded = function(event) {
        db = event.target.result;
        const objectStore = db.createObjectStore('favoritos', { keyPath: 'imdbID' });
        objectStore.createIndex('titulo', 'Title', { unique: false });
    };

    btnBuscar.addEventListener('click', async () => {
        const inputBusqueda = document.querySelector('#input-busqueda');
        const busqueda = inputBusqueda.value.trim();

        if (busqueda !== '') {
            const resultados = await obtenerDatosOMDB(busqueda);
            mostrarResultados(resultados);
        } else {
            alert('Por favor ingresa un termino de busqueda valido.');
        }
    });

    resultadoDiv.addEventListener('click', async (e) => {
        if (e.target.closest('.movie')) {
            const movieDiv = e.target.closest('.movie');
            const imdbID = movieDiv.getAttribute('data-id');
            peliculaActual = imdbID;
            await mostrarDetalles(imdbID);
        }
    });

    backButton.addEventListener('click', function() {
        document.getElementById('detalles').classList.add('d-none');
        document.getElementById('resultado').classList.remove('d-none');
    });

    addButton.addEventListener('click', function() {
        agregarAFavoritos(peliculaActual);
    });

    removeButton.addEventListener('click', function() {
        eliminarDeFavoritos(peliculaActual);
    });
});

async function obtenerDatosOMDB(busqueda) {
    const url = `http://www.omdbapi.com/?s=${busqueda}&apikey=${apiKey}`;

    try {
        const response = await fetch(url);
        const data = await response.json();
        return data.Search;
    } catch (error) {
        console.error('Error al obtener los datos de la api:', error);
        return null;
    }
}

async function obtenerPoster(imdbID) {
    const url = `http://img.omdbapi.com/?apikey=${apiKey}&i=${imdbID}`;

    try {
        const response = await fetch(url);
        const data = await response.blob();
        return URL.createObjectURL(data);
    } catch (error) {
        console.error('Error al obtener el póster de la API:', error);
        return null;
    }
}

function mostrarResultados(resultados) {
    const resultadoDiv = document.querySelector('#resultado-lista');

    if (resultados) {
        resultadoDiv.innerHTML = ''; // para limpiar los resultados anteriores

        resultados.forEach(async (resultado) => {
            const { Title, Year, Poster, imdbID } = resultado;
            const titulo = `<h3>${Title}</h3>`;
            const anio = `<p><strong>Año:</strong> ${Year}</p>`;
            
            let imagen = ''; // poster vacio
            if (Poster !== 'N/A') {
                const posterURL = await obtenerPoster(imdbID);
                if (posterURL) {
                    imagen = `<img src="${posterURL}" alt="${Title} Poster" width="100">`;
                }
            }
            
            const movieDiv = document.createElement('div');
            movieDiv.innerHTML = `${titulo}${anio}${imagen}`;
            movieDiv.classList.add('movie', 'border', 'p-3', 'mb-3');
            movieDiv.setAttribute('data-id', imdbID);
            resultadoDiv.appendChild(movieDiv);
        });
    } else {
        resultadoDiv.innerHTML = '<p>No se encontraron resultados.</p>';
    }
}

async function mostrarDetalles(imdbID) {
    const url = `http://www.omdbapi.com/?i=${imdbID}&apikey=${apiKey}`;

    try {
        const response = await fetch(url);
        const data = await response.json();
        
        const details = document.getElementById('detalles');
        const title = document.getElementById('titulo');
        const description = document.getElementById('descripcion');
        const poster = document.getElementById('poster');
        const content = document.getElementById('resultado');
        const addButton = document.getElementById('agregar-favoritos');
        const removeButton = document.getElementById('eliminar-favoritos');

        title.textContent = data.Title;
        description.textContent = `${data.Plot}\n\nDirector: ${data.Director}\nReparto: ${data.Actors}`;
        if (data.Poster !== 'N/A') {
            poster.src = data.Poster;
            poster.alt = `${data.Title} Poster`;
        } else {
            poster.src = '';
            poster.alt = 'Póster no disponible';
        }

        content.classList.add('d-none');
        details.classList.remove('d-none');

        // Verificar si la película ya está en favoritos
        const transaction = db.transaction(['favoritos'], 'readonly');
        const objectStore = transaction.objectStore('favoritos');
        const request = objectStore.get(imdbID);

        request.onsuccess = function(event) {
            if (event.target.result) {
                addButton.classList.add('d-none');
                removeButton.classList.remove('d-none');
            } else {
                addButton.classList.remove('d-none');
                removeButton.classList.add('d-none');
            }
        };
    } catch (error) {
        console.error('Error al obtener los detalles de la película:', error);
    }
}

function agregarAFavoritos(imdbID) {
    const url = `http://www.omdbapi.com/?i=${imdbID}&apikey=${apiKey}`;

    fetch(url)
        .then(response => response.json())
        .then(data => {
            const transaction = db.transaction(['favoritos'], 'readwrite');
            const objectStore = transaction.objectStore('favoritos');
            const request = objectStore.add(data);

            request.onsuccess = function(event) {
                alert('Pelicula agregada a favoritos');
                mostrarDetalles(imdbID); // Actualizar botones
                cargarFavoritos(); // Actualizar la lista de favoritos
            };

            request.onerror = function(event) {
                alert('Error al agregar a favoritos');
            };
        });
}

function eliminarDeFavoritos(imdbID) {
    const transaction = db.transaction(['favoritos'], 'readwrite');
    const objectStore = transaction.objectStore('favoritos');
    const request = objectStore.delete(imdbID);

    request.onsuccess = function(event) {
        alert('Película eliminada de favoritos');
        mostrarDetalles(imdbID); // Actualizar botones
        cargarFavoritos(); // Actualizar la lista de favoritos
    };

    request.onerror = function(event) {
        alert('Error al eliminar de favoritos');
    };
}

function cargarFavoritos() {
    const listaFavoritos = document.getElementById('lista-favoritos');
    listaFavoritos.innerHTML = '';

    const transaction = db.transaction(['favoritos'], 'readonly');
    const objectStore = transaction.objectStore('favoritos');

    objectStore.openCursor().onsuccess = function(event) {
        const cursor = event.target.result;

        if (cursor) {
            const { Title, Year, Poster, imdbID } = cursor.value;
            const titulo = `<h4>${Title}</h4>`;
            const anio = `<p><strong>Año:</strong> ${Year}</p>`;
            
            let imagen = '';
            if (Poster !== 'N/A') {
                imagen = `<img src="${Poster}" alt="${Title} Poster" width="100">`;
            }

            const favDiv = document.createElement('div');
            favDiv.innerHTML = `${titulo}${anio}${imagen}`;
            favDiv.classList.add('fav-movie', 'border', 'p-3', 'mb-3');
            favDiv.setAttribute('data-id', imdbID);
            listaFavoritos.appendChild(favDiv);

            cursor.continue();
        }
    };
}

if ('serviceWorker' in navigator) {
  window.addEventListener('load', function() {
      navigator.serviceWorker.register('/sw.js').then(function(registration) {
          console.log('Service Worker registrado con éxito:', registration.scope);
      }, function(error) {
          console.log('Error en el registro del Service Worker:', error);
      });
  });
}

