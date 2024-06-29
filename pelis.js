if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('sw.js').then(function(registration) {
        console.log('Service Worker registrado con éxito:', registration);
    }).catch(function(error) {
        console.log('Error al registrar el Service Worker:', error);
    });
} else {
    console.error('Tu navegador no soporta esta Aplicación Web');
}



const BtnSearch = document.getElementById('BtnSearch');
const TituloPeli = document.getElementById('titulo');
const DetallePelisDiv = document.getElementById('pelis');
const apiKey = 'c5ad67c';

// Busqueda
TituloPeli.addEventListener('input', () => {
    const Titulo = TituloPeli.value.trim();
    if (Titulo) {
        fetchDetallesDePelis(Titulo);
    } else {
        DetallePelisDiv.innerHTML = ''; // Limpia el resultados si no hay texto
    }
});

BtnSearch.addEventListener('click', () => {
    const Titulo = TituloPeli.value.trim();
    if (Titulo) {
        fetchDetallesDePelis(Titulo);
    } else {
        ErrorMesage('Por favor, ingrese el título de una película');
    }
});

//Fetch a la API
function fetchDetallesDePelis(titulo) {
    const url = `https://www.omdbapi.com/?apikey=${apiKey}&s=${encodeURIComponent(titulo)}`;
    fetch(url).then(resp => resp.json()).then(data => {
        if (data.Response === 'True') {
            const movieDetailsPromises = data.Search.map(pelicula => fetch(`https://www.omdbapi.com/?apikey=${apiKey}&i=${pelicula.imdbID}`).then(resp => resp.json()));
            Promise.all(movieDetailsPromises).then(movieDetails => {
                Desplegar(movieDetails);
            });
        } else {
            ErrorMesage(data.Error);
        }
    }).catch(error => {
        ErrorMesage('Ocurrió un error al buscar la película');
        console.error('Error fetching movie details:', error);
    });
}

//Despliegue de la busqueda
function Desplegar(movies) {
    let html = '';
    movies.forEach(peliculas => {
        html += `
            <div class="col-lg-3 col-md-6 col-sm-12 d-flex justify-content-center">
                <div class="bg-dark card pelis rounded mb-3" style="width: 18rem;">
                    <img class="card-img-top rounded" src="${peliculas.Poster !== 'N/A' ? peliculas.Poster : 'https://via.placeholder.com/150'}" alt="${peliculas.Title}">
                    <div class="card-body">
                        <h5 class="card-title text-light fw-bold">${peliculas.Title}</h5>
                        <p class="fs-6 fw-bold carmesi"><i class="me-2 fa-solid fa-user"></i>${peliculas.Director}</p>
                        <p class="card-text text-light border-bottom border-2 fs-5">${peliculas.Plot}</p>
                        <p class="card-text carmesi fs-4">${peliculas.Year}</p>
                        <div class="mb-3">
                            <button class="btn btn-outline-danger w-100 fs-5 view-details" data-imdbid="${peliculas.imdbID}">Ver</button>
                        </div>
                    </div>
                </div>
            </div>
        `;
    });
    DetallePelisDiv.innerHTML = html;

    document.querySelectorAll('.view-details').forEach(button => {
        button.addEventListener('click', function() {
            const imdbID = this.getAttribute('data-imdbid');
            showModal(imdbID);
        });
    });
}

function showModal(imdbID) {
    const url = `https://www.omdbapi.com/?apikey=${apiKey}&i=${imdbID}`;
    fetch(url)
        .then(resp => resp.json())
        .then(data => {
            const modalContent = `
                <img class="card-img-top rounded" src="${data.Poster !== 'N/A' ? data.Poster : 'https://via.placeholder.com/150'}" alt="${data.Title}">
                <h5 class="card-title text-dark fw-bold mt-3">${data.Title}</h5>
                <p class="fs-6 fw-bold carmesi"><i class="me-2 fa-solid fa-user"></i>${data.Director}</p>
                <p class="card-text text-dark border-bottom border-2 fs-5">${data.Plot}</p>
                <p class="card-text carmesi fs-4">${data.Year}</p>
                <p class="card-text text-dark fs-5">Genero: ${data.Genre}</p>
                <p class="card-text text-dark fs-5">Actores: ${data.Actors}</p>
                <p class="card-text text-dark fs-5">Rating: ${data.imdbRating}</p>
            `;
            document.getElementById('modalContent').innerHTML = modalContent;
            const addToFavoritesButton = document.getElementById('addToFavorites');
            addToFavoritesButton.onclick = function() {
                addToFavorites(data);
            };
            const movieModal = new bootstrap.Modal(document.getElementById('movieModal'));
            movieModal.show();
        })
        .catch(error => {
            ErrorMesage('Ocurrió un error al buscar los detalles de la película');
            console.error('Error fetching movie details:', error);
        });
}


function ErrorMesage(message) {
    DetallePelisDiv.innerHTML = `<div class="alert alert-danger" role="alert">${message}</div>`;
}

let db;
const request = indexedDB.open('PelisPlusDB', 1);

request.onupgradeneeded = function(event) {
    db = event.target.result;
    const objectStore = db.createObjectStore('favoritos', { keyPath: 'imdbID' });
    objectStore.transaction.oncomplete = function() {
        console.log('IndexedDB setup complete');
    };
};

request.onsuccess = function(event) {
    db = event.target.result;
    console.log('IndexedDB connected');
};

request.onerror = function(event) {
    console.error('IndexedDB error:', event.target.errorCode);
};

function addToFavorites(movie) {
    const transaction = db.transaction(['favoritos'], 'readwrite');
    const objectStore = transaction.objectStore('favoritos');
    const request = objectStore.add(movie);

    request.onsuccess = function() {
        Swal.fire('Éxito', 'Película agregada a favoritos', 'success');
        loadFavorites(); // Recargar la lista de favoritos
    };

    request.onerror = function() {
        Swal.fire('Error', 'No se pudo agregar la película a favoritos', 'error');
    };
}


function loadFavorites() {
    const transaction = db.transaction(['favoritos'], 'readonly');
    const objectStore = transaction.objectStore('favoritos');
    const request = objectStore.getAll();

    request.onsuccess = function(event) {
        const favoritos = event.target.result;
        let html = '';
        if (favoritos.length === 0) {
            html = '<p class="text-center text-muted">Aún no hay favoritos</p>';
        } else {
            favoritos.forEach(peliculas => {
                html += `
                    <div class="col-lg-3 col-md-6 col-sm-12 d-flex justify-content-center">
                        <div class="bg-dark card pelis rounded mb-3" style="width: 18rem;">
                            <img class="card-img-top rounded" src="${peliculas.Poster !== 'N/A' ? peliculas.Poster : 'https://via.placeholder.com/150'}" alt="${peliculas.Title}">
                            <div class="card-body">
                                <h5 class="card-title text-light fw-bold">${peliculas.Title}</h5>
                                <p class="fs-6 fw-bold carmesi"><i class="me-2 fa-solid fa-user"></i>${peliculas.Director}</p>
                                <p class="card-text text-light border-bottom border-2 fs-5">${peliculas.Plot}</p>
                                <p class="card-text carmesi fs-4">${peliculas.Year}</p>
                                <button class="btn btn-outline-danger w-100 fs-5 remove-favorite" data-imdbid="${peliculas.imdbID}">Eliminar de Favoritos</button>
                            </div>
                        </div>
                    </div>
                `;
            });
        }
        document.getElementById('favoritosList').innerHTML = html;

        // Añadir evento de clic a los botones de eliminar
        document.querySelectorAll('.remove-favorite').forEach(button => {
            button.addEventListener('click', function() {
                const imdbID = this.getAttribute('data-imdbid');
                removeFromFavorites(imdbID);
            });
        });
    };

    request.onerror = function(event) {
        console.error('Error loading favorites:', event.target.errorCode);
    };
}


// Cargar favoritos cuando la base de datos esté lista
request.onsuccess = function(event) {
    db = event.target.result;
    console.log('IndexedDB connected');
    loadFavorites(); // Cargar favoritos cuando la base de datos esté lista
};

function removeFromFavorites(imdbID) {
    const transaction = db.transaction(['favoritos'], 'readwrite');
    const objectStore = transaction.objectStore('favoritos');
    const request = objectStore.delete(imdbID);

    request.onsuccess = function() {
        Swal.fire('Éxito', 'Película eliminada de favoritos', 'success');
        loadFavorites(); // Recargar la lista de favoritos
    };

    request.onerror = function() {
        Swal.fire('Error', 'No se pudo eliminar la película de favoritos', 'error');
    };
}