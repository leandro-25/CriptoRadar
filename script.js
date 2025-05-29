/**
 * CryptoViewer - Visualizador de Dados de Criptomoedas
 * 
 * Este script implementa a lógica para buscar e exibir dados de criptomoedas
 * utilizando a API CoinGecko. Demonstra o uso de requisições assíncronas
 * com async/await e manipulação do DOM.
 * 
 * Desenvolvido para Avaliação Prática em JavaScript - FATEC
 */

// Elementos do DOM
const cryptoGrid = document.getElementById('cryptoGrid'); // Obtém a referência ao elemento HTML com o ID 'cryptoGrid', onde os cards de criptomoedas serão exibidos.
const loadingIndicator = document.getElementById('loadingIndicator'); // Obtém a referência ao elemento HTML com o ID 'loadingIndicator', usado para mostrar um indicador de carregamento.
const errorContainer = document.getElementById('errorContainer'); // Obtém a referência ao elemento HTML com o ID 'errorContainer', onde mensagens de erro serão exibidas.
const errorMessage = document.getElementById('errorMessage'); // Obtém a referência ao elemento HTML com o ID 'errorMessage', usado para mostrar o texto da mensagem de erro.
const searchInput = document.getElementById('searchInput'); // Obtém a referência ao campo de entrada de texto com o ID 'searchInput', usado para pesquisar criptomoedas.
const searchBtn = document.getElementById('searchBtn'); // Obtém a referência ao botão com o ID 'searchBtn', usado para iniciar a pesquisa de criptomoedas.
const refreshBtn = document.getElementById('refreshBtn'); // Obtém a referência ao botão com o ID 'refreshBtn', usado para atualizar os dados das criptomoedas.
const retryBtn = document.getElementById('retryBtn'); // Obtém a referência ao botão com o ID 'retryBtn', usado para tentar novamente uma operação que falhou.
const currencySelect = document.getElementById('currencySelect'); // Obtém a referência ao elemento de seleção com o ID 'currencySelect', usado para escolher a moeda de referência.
const lastUpdated = document.getElementById('lastUpdated'); // Obtém a referência ao elemento HTML com o ID 'lastUpdated', onde o horário da última atualização é exibido.

// Elementos do modal de gráficos
const chartModal = document.getElementById('chartModal'); // Obtém a referência ao modal com o ID 'chartModal', que exibe o gráfico de uma criptomoeda.
const chartCanvas = document.getElementById('chartCanvas'); // Obtém a referência ao elemento canvas com o ID 'chartCanvas', onde o gráfico é desenhado.
const chartTitle = document.getElementById('chartTitle'); // Obtém a referência ao elemento HTML com o ID 'chartTitle', que exibe o título do gráfico (nome da criptomoeda).
const timeframeSelect = document.getElementById('timeframeSelect'); // Obtém a referência ao elemento de seleção com o ID 'timeframeSelect', usado para escolher o período do gráfico.
const chartTypeSelect = document.getElementById('chartTypeSelect'); // Obtém a referência ao elemento de seleção com o ID 'chartTypeSelect', usado para escolher o tipo de gráfico (linha, barra, etc.).
const closeChartBtn = document.getElementById('closeChartBtn'); // Obtém a referência ao botão com o ID 'closeChartBtn', usado para fechar o modal do gráfico.
const indicatorsBtn = document.getElementById('indicatorsBtn'); // Obtém a referência ao botão com o ID 'indicatorsBtn', usado para abrir o menu de indicadores técnicos do gráfico.
const indicatorsMenu = document.getElementById('indicatorsMenu'); // Obtém a referência ao menu com o ID 'indicatorsMenu', que lista os indicadores técnicos disponíveis.

// Configurações da API
const API_BASE_URL = 'https://api.coingecko.com/api/v3'; // Define a URL base da API CoinGecko, de onde os dados das criptomoedas são obtidos.
const DEFAULT_COINS = 18; // Número de moedas a serem exibidas por padrão // Define o número padrão de criptomoedas a serem carregadas e exibidas inicialmente.

// Estado da aplicação
let lastFetchedData = []; // Armazena os últimos dados obtidos para filtragem
let selectedCurrency = 'brl'; // Define a moeda padrão como Real Brasileiro
let priceChart = null; // Referência ao objeto do gráfico, inicialmente nulo
let currentCoin = null; // Moeda atualmente selecionada para exibição no gráfico
let chartIndicators = {
    ma: false, // Indicador de média móvel, inicialmente desativado
    bb: false // Indicador de Bandas de Bollinger, inicialmente desativado
    // Removida a propriedade volume
};

/**
 * Inicializa a aplicação
 */
function init() {
    // Configura os event listeners
    setupEventListeners();
    
    // Carrega os dados iniciais
    fetchCryptoData();
    
    // Configura atualização automática a cada 2 minutos
    setInterval(() => {
        if (document.visibilityState === 'visible') { // Verifica se a página está visível
            fetchCryptoData(); // Atualiza os dados das criptomoedas
        }
    }, 120000); // Intervalo de 2 minutos
}

/**
 * Configura os event listeners para os elementos interativos
 */
function setupEventListeners() {
    // Botão de busca
    searchBtn.addEventListener('click', handleSearch); // Adiciona evento de clique para iniciar a busca
    
    // Busca ao pressionar Enter no campo de busca
    searchInput.addEventListener('keyup', (e) => {
        if (e.key === 'Enter') { // Verifica se a tecla pressionada é Enter
            handleSearch(); // Inicia a busca
        }
    });
    
    // Botão de atualização
    refreshBtn.addEventListener('click', () => fetchCryptoData(true)); // Adiciona evento de clique para atualizar os dados
    
    // Botão de tentar novamente em caso de erro
    retryBtn.addEventListener('click', () => fetchCryptoData(true)); // Adiciona evento de clique para tentar novamente
    
    // Seletor de moeda
    currencySelect.addEventListener('change', (e) => {
        selectedCurrency = e.target.value; // Atualiza a moeda selecionada
        // Sempre buscar novos dados quando a moeda mudar
        fetchCryptoData();
    });
    
    // Eventos para o modal de gráficos
    closeChartBtn.addEventListener('click', () => {
        chartModal.style.display = 'none'; // Fecha o modal do gráfico
    });
    
    // Fechar o modal ao clicar fora dele
    chartModal.addEventListener('click', (e) => {
        if (e.target === chartModal) { // Verifica se o clique foi fora do conteúdo do modal
            chartModal.style.display = 'none'; // Fecha o modal
        }
    });
    
    // Atualizar o gráfico quando o timeframe mudar
    timeframeSelect.addEventListener('change', () => {
        if (currentCoin) {
            fetchChartData(currentCoin);
        }
    });
    
    // Atualizar o gráfico quando o tipo de gráfico mudar
    chartTypeSelect.addEventListener('change', () => {
        if (currentCoin) {
            fetchChartData(currentCoin);
        }
    });
    
    // Mostrar/esconder menu de indicadores
    indicatorsBtn.addEventListener('click', () => {
        indicatorsMenu.style.display = indicatorsMenu.style.display === 'block' ? 'none' : 'block';
    });
    
    // Fechar o menu de indicadores ao clicar fora dele
    document.addEventListener('click', (e) => {
        if (!indicatorsBtn.contains(e.target) && !indicatorsMenu.contains(e.target)) {
            indicatorsMenu.style.display = 'none';
        }
    });
    
    // Adicionar event listeners para os checkboxes de indicadores
    document.getElementById('maCheckbox').addEventListener('change', (e) => {
        chartIndicators.ma = e.target.checked;
        if (currentCoin && priceChart) {
            // Remove datasets anteriores exceto o primeiro (preço)
            priceChart.data.datasets = [priceChart.data.datasets[0]];
            updateChartIndicators();
        }
    });
    
    document.getElementById('bbCheckbox').addEventListener('change', (e) => {
        chartIndicators.bb = e.target.checked;
        if (currentCoin && priceChart) {
            // Remove datasets anteriores exceto o primeiro (preço)
            priceChart.data.datasets = [priceChart.data.datasets[0]];
            updateChartIndicators();
        }
    });
    
    // Removido o event listener para o checkbox de volume
}

/**
 * Manipula a busca de criptomoedas
 */
function handleSearch() {
    const searchTerm = searchInput.value.trim().toLowerCase();
    
    if (!searchTerm) {
        // Se o campo de busca estiver vazio, exibe todos os dados
        renderCryptoCards(lastFetchedData);
        return;
    }
    
    // Primeiro, tenta filtrar os dados já carregados
    const filteredData = lastFetchedData.filter(coin => 
        coin.name.toLowerCase().includes(searchTerm) || 
        coin.symbol.toLowerCase().includes(searchTerm)
    );
    
    if (filteredData.length > 0) {
        // Se encontrou resultados nos dados já carregados, exibe-os
        renderCryptoCards(filteredData);
    } else {
        // Se não encontrou nos dados carregados, busca na API
        searchCryptoFromAPI(searchTerm);
    }
}

/**
 * Busca criptomoedas diretamente da API pelo termo de busca
 * @param {string} searchTerm - Termo de busca
 */
async function searchCryptoFromAPI(searchTerm) {
    // Exibe o indicador de carregamento
    showLoading(true);
    
    try {
        // Busca na API usando o endpoint de pesquisa
        const url = `${API_BASE_URL}/search?query=${encodeURIComponent(searchTerm)}`;
        
        const response = await fetch(url);
        
        if (!response.ok) {
            if (response.status === 429) {
                throw new Error(`Limite de requisições atingido. Por favor, aguarde alguns minutos e tente novamente.`);
            }
            throw new Error(`Erro na API: ${response.status} ${response.statusText}`);
        }
        
        const searchData = await response.json();
        
        // Verifica se há resultados na categoria de moedas
        if (!searchData.coins || searchData.coins.length === 0) {
            cryptoGrid.innerHTML = `
                <div class="no-results">
                    <i class="fas fa-search"></i>
                    <p>Nenhuma criptomoeda encontrada para "${searchTerm}"</p>
                </div>
            `;
            showLoading(false);
            return;
        }
        
        // Limita a 20 resultados para não sobrecarregar
        const coinIds = searchData.coins.slice(0, 20).map(coin => coin.id).join(',');
        
        // Busca os dados detalhados das moedas encontradas
        const detailsUrl = `${API_BASE_URL}/coins/markets?vs_currency=${selectedCurrency}&ids=${coinIds}&order=market_cap_desc&sparkline=false&price_change_percentage=24h,7d`;
        
        const detailsResponse = await fetch(detailsUrl);
        
        if (!detailsResponse.ok) {
            throw new Error(`Erro ao buscar detalhes das moedas: ${detailsResponse.status}`);
        }
        
        const detailedCoins = await detailsResponse.json();
        
        if (detailedCoins.length === 0) {
            cryptoGrid.innerHTML = `
                <div class="no-results">
                    <i class="fas fa-search"></i>
                    <p>Nenhuma criptomoeda encontrada para "${searchTerm}"</p>
                </div>
            `;
        } else {
            // Renderiza os resultados da busca
            renderCryptoCards(detailedCoins);
        }
        
        showLoading(false);
    } catch (error) {
        console.error('Erro ao buscar criptomoedas:', error);
        showError(`Não foi possível realizar a busca: ${error.message}`);
    }
}

/**
 * Busca dados de criptomoedas da API CoinGecko
 * Implementa requisição assíncrona usando async/await
 * @param {boolean} forceUpdate - Se verdadeiro, ignora o cache e força uma atualização
 */
async function fetchCryptoData(forceUpdate = false) {
    // Exibe o indicador de carregamento
    showLoading(true);
    
    try {
        // Verifica se há dados em cache e se são recentes (menos de 5 minutos)
        const cachedData = localStorage.getItem(`crypto_data_${selectedCurrency}`);
        const cachedTime = localStorage.getItem(`crypto_data_time_${selectedCurrency}`);
        
        // Se não estiver forçando atualização e houver cache recente, use-o
        if (!forceUpdate && cachedData && cachedTime) {
            const now = new Date().getTime();
            const cacheAge = now - parseInt(cachedTime);
            
            // Se o cache for recente (menos de 5 minutos), use-o
            if (cacheAge < 12000) { // 5 minutos em milissegundos
                const data = JSON.parse(cachedData);
                lastFetchedData = data;
                renderCryptoCards(data);
                showLoading(false);
                updateLastUpdatedTime(new Date(parseInt(cachedTime)));
                return;
            }
        }
        
        // Se não houver cache ou for antigo, busque da API
        const url = `${API_BASE_URL}/coins/markets?vs_currency=${selectedCurrency}&order=market_cap_desc&per_page=${DEFAULT_COINS}&page=1&sparkline=false&price_change_percentage=24h,7d`;
        
        const response = await fetch(url);
        
        if (!response.ok) {
            if (response.status === 429) {
                throw new Error(`Limite de requisições atingido. Por favor, aguarde alguns minutos e tente novamente.`);
            }
            throw new Error(`Erro na API: ${response.status} ${response.statusText}`);
        }
        
        const data = await response.json();
        
        if (!data || data.length === 0) {
            throw new Error('Nenhum dado de criptomoeda foi retornado pela API.');
        }
        
        // Armazena os dados no cache
        localStorage.setItem(`crypto_data_${selectedCurrency}`, JSON.stringify(data));
        const currentTime = new Date().getTime();
        localStorage.setItem(`crypto_data_time_${selectedCurrency}`, currentTime.toString());
        
        // Armazena os dados para uso posterior
        lastFetchedData = data;
        
        // Renderiza os cards de criptomoedas
        renderCryptoCards(data);
        
        // Atualiza o tempo da última atualização
        updateLastUpdatedTime(new Date(currentTime));
        
        // Esconde o indicador de carregamento
        showLoading(false);
    } catch (error) {
        console.error('Erro ao buscar dados de criptomoedas:', error);
        showError(`Não foi possível carregar os dados: ${error.message}`);
    }
}

/**
 * Renderiza os cards de criptomoedas na interface
 * @param {Array} coins - Array de objetos com dados das criptomoedas
 */
function renderCryptoCards(coins) {
    // Limpa o grid antes de adicionar novos cards
    cryptoGrid.innerHTML = '';
    
    // Formata valores monetários de acordo com a moeda selecionada
    const formatter = new Intl.NumberFormat('pt-BR', {
        style: 'currency',
        currency: selectedCurrency.toUpperCase(),
        minimumFractionDigits: 2,
        maximumFractionDigits: 6
    });
    
    // Cria um card para cada moeda
    coins.forEach(coin => {
        // Determina a classe CSS com base na variação de preço
        const priceChangeClass = coin.price_change_percentage_24h >= 0 ? 'positive' : 'negative';
        const priceChangeIcon = coin.price_change_percentage_24h >= 0 ? 'fa-caret-up' : 'fa-caret-down';
        
        // Cria o elemento do card
        const card = document.createElement('div');
        card.className = 'crypto-card';
        
        // Preenche o conteúdo do card
        card.innerHTML = `
            <div class="crypto-header">
                <img src="${coin.image}" alt="${coin.name}" class="crypto-image">
                <div class="crypto-name">
                    <h2>${coin.name}</h2>
                    <span class="crypto-symbol">${coin.symbol.toUpperCase()}</span>
                </div>
            </div>
            
            <div class="crypto-price">${formatter.format(coin.current_price)}</div>
            
            <div class="price-change ${priceChangeClass}">
                <i class="fas ${priceChangeIcon}"></i>
                ${Math.abs(coin.price_change_percentage_24h).toFixed(2)}% (24h)
            </div>
            
            <div class="crypto-details">
                <div class="detail-item">
                    <span class="detail-label">Cap. de Mercado</span>
                    <span class="detail-value">${formatter.format(coin.market_cap)}</span>
                </div>
                <div class="detail-item">
                    <span class="detail-label">Volume (24h)</span>
                    <span class="detail-value">${formatter.format(coin.total_volume)}</span>
                </div>
                <div class="detail-item">
                    <span class="detail-label">Máxima (24h)</span>
                    <span class="detail-value">${formatter.format(coin.high_24h)}</span>
                </div>
                <div class="detail-item">
                    <span class="detail-label">Mínima (24h)</span>
                    <span class="detail-value">${formatter.format(coin.low_24h)}</span>
                </div>
            </div>
            
            <button class="chart-btn" data-id="${coin.id}">
                <i class="fas fa-chart-line"></i> Ver Gráfico
            </button>
        `;
        
        // Adiciona o card ao grid
        cryptoGrid.appendChild(card);
        
        // Adiciona evento de clique ao botão de gráfico
        const chartBtn = card.querySelector('.chart-btn');
        chartBtn.addEventListener('click', () => {
            openChartModal(coin);
        });
    });
}

/**
 * Abre o modal com o gráfico da criptomoeda selecionada
 * @param {Object} coin - Objeto com dados da criptomoeda
 */
function openChartModal(coin) {
    // Armazena a moeda atual
    currentCoin = coin;
    
    // Define o título do modal
    chartTitle.textContent = `${coin.name} (${coin.symbol.toUpperCase()})`;
    
    // Exibe o modal
    chartModal.style.display = 'flex';
    
    // Busca os dados do gráfico
    fetchChartData(coin);
}

/**
 * Busca dados históricos para o gráfico
 * @param {Object} coin - Objeto com dados da criptomoeda
 */
async function fetchChartData(coin) {
    try {
        // Obtém o período selecionado
        const days = timeframeSelect.value;
        
        // Apenas o tipo de gráfico de linha é suportado agora
        // const chartType = chartTypeSelect.value;
        
        // URL para dados de preço
        const priceUrl = `${API_BASE_URL}/coins/${coin.id}/market_chart?vs_currency=${selectedCurrency}&days=${days}`;
        
        // Busca os dados de preço
        const priceResponse = await fetch(priceUrl);
        
        if (!priceResponse.ok) {
            throw new Error(`Erro ao buscar dados do gráfico: ${priceResponse.status}`);
        }
        
        const priceData = await priceResponse.json();
        
        // Renderiza o gráfico de linha
        renderChart(coin, priceData.prices, null, 'line');
    } catch (error) {
        console.error('Erro ao buscar dados do gráfico:', error);
        // Garante que chartCanvas é o elemento correto para exibir o erro
        const chartCanvasElement = document.getElementById('chartCanvas'); 
        if (chartCanvasElement) {
            chartCanvasElement.innerHTML = `<div class="chart-error">Erro ao carregar o gráfico: ${error.message}</div>`;
        } else {
            // Fallback se chartCanvas não for encontrado, embora não deva acontecer
            document.querySelector('.chart-container').innerHTML = `<div class="chart-error">Erro ao carregar o gráfico: ${error.message}</div>`;
        }
    }
}

/**
 * Renderiza o gráfico com os dados obtidos
 * @param {Object} coin - Objeto com dados da criptomoeda
 * @param {Array} prices - Array com dados de preços
 * @param {null} ohlcData - Não utilizado mais, mantido para compatibilidade de assinatura se necessário em outros lugares, mas pode ser removido.
 * @param {string} chartType - Sempre 'line' agora
 */
function renderChart(coin, prices, ohlcData, chartType) {
    // Limpa o canvas para o novo gráfico
    if (priceChart) {
        priceChart.destroy();
    }
    
    // Obtém o contexto do canvas
    const ctx = chartCanvas.getContext('2d');
    
    // Cores para o gráfico
    const primaryColor = coin.price_change_percentage_24h >= 0 ? 'rgba(14, 203, 129, 1)' : 'rgba(246, 70, 93, 1)';
    const secondaryColor = coin.price_change_percentage_24h >= 0 ? 'rgba(14, 203, 129, 0.1)' : 'rgba(246, 70, 93, 0.1)';
    
    let config;
    
    if (chartType === 'candlestick' && ohlcData) {
        // Configuração para gráfico de candlestick
        config = {
            type: 'candlestick',
            data: {
                labels: prices.map(price => new Date(price[0])),
                datasets: [{
                    label: `Preço (${selectedCurrency.toUpperCase()})`,
                    data: prices.map(price => price[1]),
                    borderColor: primaryColor,
                    backgroundColor: secondaryColor,
                    borderWidth: 2,
                    fill: true,
                    tension: 0.1,
                    pointRadius: 0,
                    pointHoverRadius: 5,
                    pointHitRadius: 10
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                interaction: {
                    mode: 'index',
                    intersect: false,
                },
                plugins: {
                    legend: {
                        display: false
                    },
                    tooltip: {
                        mode: 'index',
                        intersect: false,
                        callbacks: {
                            label: function(context) {
                                let label = context.dataset.label || '';
                                if (label) {
                                    label += ': ';
                                }
                                const formatter = new Intl.NumberFormat('pt-BR', {
                                    style: 'currency',
                                    currency: selectedCurrency.toUpperCase()
                                });
                                label += formatter.format(context.parsed.y);
                                return label;
                            }
                        }
                    },
                    // Configuração do plugin de zoom
                zoom: {
                    pan: {
                        enabled: true,
                        mode: 'xy',
                        threshold: 5,
                    },
                    zoom: {
                        wheel: {
                            enabled: false, // Desativado o zoom com a roda do mouse
                        },
                        pinch: {
                            enabled: false  // Desativado o zoom com pinça
                        },
                        mode: 'xy',
                        drag: {
                            enabled: false, // Desativado o zoom ao arrastar uma área
                            backgroundColor: 'rgba(121, 151, 181, 0.3)',
                            borderColor: 'rgba(121, 151, 181, 0.8)',
                            borderWidth: 1
                        }
                    },
                    limits: {
                        x: {minRange: 60 * 60 * 1000}, // Mínimo de 1 hora
                        y: {min: 'original'}
                    }
                    }
                },
                scales: {
                    x: {
                        type: 'time',
                        time: {
                            unit: getTimeUnit(prices.length)
                        },
                        grid: {
                            display: false,
                            drawBorder: false
                        },
                        ticks: {
                            color: '#787b86'
                        }
                    },
                    y: {
                        position: 'right',
                        grid: {
                            color: 'rgba(42, 46, 57, 0.5)'
                        },
                        ticks: {
                            color: '#787b86'
                        }
                    }
                }
            }
        };
    } else {
        // Configuração para gráfico de linha
        config = {
            type: 'line',
            data: {
                labels: prices.map(price => new Date(price[0])),
                datasets: [{
                    label: `Preço (${selectedCurrency.toUpperCase()})`,
                    data: prices.map(price => price[1]),
                    borderColor: primaryColor,
                    backgroundColor: secondaryColor,
                    borderWidth: 2,
                    fill: true,
                    tension: 0.1,
                    pointRadius: 0,
                    pointHoverRadius: 5,
                    pointHitRadius: 10
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                interaction: {
                    mode: 'index',
                    intersect: false,
                },
                plugins: {
                    legend: {
                        display: false
                    },
                    tooltip: {
                        mode: 'index',
                        intersect: false,
                        callbacks: {
                            label: function(context) {
                                let label = context.dataset.label || '';
                                if (label) {
                                    label += ': ';
                                }
                                const formatter = new Intl.NumberFormat('pt-BR', {
                                    style: 'currency',
                                    currency: selectedCurrency.toUpperCase()
                                });
                                label += formatter.format(context.parsed.y);
                                return label;
                            }
                        }
                    },
                    // Configuração do plugin de zoom
                zoom: {
                    pan: {
                        enabled: true,
                        mode: 'xy',
                        threshold: 5,
                    },
                    zoom: {
                        wheel: {
                            enabled: false, // Desativado o zoom com a roda do mouse
                        },
                        pinch: {
                            enabled: false  // Desativado o zoom com pinça
                        },
                        mode: 'xy',
                        drag: {
                            enabled: false, // Desativado o zoom ao arrastar uma área
                            backgroundColor: 'rgba(121, 151, 181, 0.3)',
                            borderColor: 'rgba(121, 151, 181, 0.8)',
                            borderWidth: 1
                        }
                    },
                    limits: {
                        x: {minRange: 60 * 60 * 1000}, // Mínimo de 1 hora
                        y: {min: 'original'}
                    }
                    }
                },
                scales: {
                    x: {
                        type: 'time',
                        time: {
                            unit: getTimeUnit(prices.length)
                        },
                        grid: {
                            display: false,
                            drawBorder: false
                        },
                        ticks: {
                            color: '#787b86'
                        }
                    },
                    y: {
                        position: 'right',
                        grid: {
                            color: 'rgba(42, 46, 57, 0.5)'
                        },
                        ticks: {
                            color: '#787b86'
                        }
                    }
                }
            }
        };
    }
    
    priceChart = new Chart(ctx, config);
    
    // Adiciona indicadores técnicos se estiverem ativados
    if (chartType === 'line' && (chartIndicators.ma || chartIndicators.bb)) {
        updateChartIndicators();
    }
    
    // Adiciona botões de controle de zoom
    addZoomControls();
}

/**
 * Adiciona botões para controlar o zoom do gráfico
 */
function addZoomControls() {
    // Verifica se os botões já existem
    if (document.getElementById('zoomControls')) {
        return;
    }
    
    // Cria o container para os botões de zoom
    const zoomControls = document.createElement('div');
    zoomControls.id = 'zoomControls';
    zoomControls.className = 'zoom-controls';
    
    // Botão de zoom in
    const zoomInBtn = document.createElement('button');
    zoomInBtn.innerHTML = '<i class="fas fa-search-plus"></i>';
    zoomInBtn.title = 'Aumentar zoom';
    zoomInBtn.addEventListener('click', () => {
        if (priceChart) {
            priceChart.zoom(1.1);
        }
    });
    
    // Botão de zoom out
    const zoomOutBtn = document.createElement('button');
    zoomOutBtn.innerHTML = '<i class="fas fa-search-minus"></i>';
    zoomOutBtn.title = 'Diminuir zoom';
    zoomOutBtn.addEventListener('click', () => {
        if (priceChart) {
            priceChart.zoom(0.9);
        }
    });
    
    // Botão de reset
    const resetZoomBtn = document.createElement('button');
    resetZoomBtn.innerHTML = '<i class="fas fa-undo"></i>';
    resetZoomBtn.title = 'Resetar zoom';
    resetZoomBtn.addEventListener('click', () => {
        if (priceChart) {
            priceChart.resetZoom();
        }
    });
    
    // Adiciona os botões ao container
    zoomControls.appendChild(zoomInBtn);
    zoomControls.appendChild(zoomOutBtn);
    zoomControls.appendChild(resetZoomBtn);
    
    // Adiciona o container à área do gráfico
    const chartContainer = document.querySelector('.chart-container');
    chartContainer.appendChild(zoomControls);
}

/**
 * Atualiza os indicadores técnicos no gráfico
 */
function updateChartIndicators() {
    if (!priceChart || !currentCoin) return;
    
    // Remove datasets anteriores exceto o primeiro (preço)
    priceChart.data.datasets = [priceChart.data.datasets[0]];
    
    // Adiciona Média Móvel se estiver ativada
    if (chartIndicators.ma) {
        const prices = priceChart.data.datasets[0].data;
        const ma20 = calculateMA(prices, 20);
        
        priceChart.data.datasets.push({
            label: 'MA (20)',
            data: ma20,
            borderColor: 'rgb(255, 255, 255)',
            borderWidth: 1.5,
            pointRadius: 0,
            fill: false
        });
    }
    
    // Adiciona Bandas de Bollinger se estiverem ativadas
    if (chartIndicators.bb) {
        const prices = priceChart.data.datasets[0].data;
        const bb = calculateBollingerBands(prices, 21, 2);
        
        priceChart.data.datasets.push({
            label: 'BB Superior',
            data: bb.upper,
            borderColor: 'rgba(118, 152, 255, 1)',
            borderWidth: 1.5,
            pointRadius: 0,
            fill: false
        });
        
        priceChart.data.datasets.push({
            label: 'BB Inferior',
            data: bb.lower,
            borderColor: 'rgba(118, 152, 255, 1)',
            borderWidth: 1.5,
            pointRadius: 0,
            fill: false,
            backgroundColor: 'rgba(118, 152, 255, 0.1)'
        });
    }
    
    // Adiciona Volume se estiver ativado
    if (chartIndicators.volume) {
        // Precisamos buscar os dados de volume da API
        fetchVolumeData(currentCoin);
    }
    
    // Atualiza o gráfico
    priceChart.update();
}

/**
 * Busca dados de volume para o gráfico
 * @param {Object} coin - Objeto com dados da criptomoeda
 */
async function fetchVolumeData(coin) {
    try {
        // Obtém o período selecionado
        const days = timeframeSelect.value;
        
        // URL para dados de volume
        const volumeUrl = `${API_BASE_URL}/coins/${coin.id}/market_chart?vs_currency=${selectedCurrency}&days=${days}`;
        
        // Busca os dados de volume
        const volumeResponse = await fetch(volumeUrl);
        
        if (!volumeResponse.ok) {
            throw new Error(`Erro ao buscar dados de volume: ${volumeResponse.status}`);
        }
        
        const volumeData = await volumeResponse.json();
        
        // Adiciona o dataset de volume ao gráfico
        if (volumeData.total_volumes && volumeData.total_volumes.length > 0) {
            // Cria um novo canvas para o volume abaixo do gráfico principal
            let volumeCanvas = document.getElementById('volumeCanvas');
            
            if (!volumeCanvas) {
                volumeCanvas = document.createElement('canvas');
                volumeCanvas.id = 'volumeCanvas';
                volumeCanvas.height = 150; // Aumentando a altura de 100 para 150
                document.querySelector('.chart-container').appendChild(volumeCanvas);
            }
            
            // Limpa o canvas de volume se já existir um gráfico
            if (window.volumeChart) {
                window.volumeChart.destroy();
            }
            
            // Configura o gráfico de volume
            const volumeCtx = volumeCanvas.getContext('2d');
            
            window.volumeChart = new Chart(volumeCtx, {
                type: 'bar',
                data: {
                    labels: volumeData.total_volumes.map(vol => new Date(vol[0])),
                    datasets: [{
                        label: `Volume (${selectedCurrency.toUpperCase()})`,
                        data: volumeData.total_volumes.map(vol => vol[1]),
                        backgroundColor: 'rgba(118, 152, 255, 0.5)',
                        borderColor: 'rgba(118, 152, 255, 1)',
                        borderWidth: 1
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                        legend: {
                            display: false
                        },
                        tooltip: {
                            callbacks: {
                                label: function(context) {
                                    const formatter = new Intl.NumberFormat('pt-BR', {
                                        style: 'currency',
                                        currency: selectedCurrency.toUpperCase()
                                    });
                                    return `Volume: ${formatter.format(context.parsed.y)}`;
                                }
                            }
                        }
                    },
                    scales: {
                        x: {
                            type: 'time',
                            time: {
                                unit: getTimeUnit(volumeData.total_volumes.length)
                            },
                            grid: {
                                display: false
                            },
                            ticks: {
                                display: false // Oculta os ticks do eixo X para economizar espaço
                            }
                        },
                        y: {
                            position: 'right',
                            grid: {
                                color: 'rgba(42, 46, 57, 0.5)'
                            },
                            ticks: {
                                color: '#787b86'
                            }
                        }
                    }
                }
            });
            
            // Sincroniza o zoom/pan entre os gráficos
            priceChart.options.plugins.zoom = {
                zoom: {
                    wheel: {
                        enabled: true
                    },
                    pinch: {
                        enabled: true
                    },
                    mode: 'x',
                    onZoom: function() {
                        window.volumeChart.update();
                    }
                },
                pan: {
                    enabled: true,
                    mode: 'x',
                    onPan: function() {
                        window.volumeChart.update();
                    }
                }
            };
            
            priceChart.update();
        }
    } catch (error) {
        console.error('Erro ao buscar dados de volume:', error);
    }
}

/**
 * Calcula a Média Móvel Simples
 * @param {Array} data - Array de dados de preço
 * @param {number} period - Período da média móvel
 * @returns {Array} - Array com os valores da média móvel
 */
function calculateMA(data, period) {
    const result = [];
    
    // Implementação simplificada da média móvel
    for (let i = 0; i < data.length; i++) {
        if (i < period - 1) {
            result.push(null);
        } else {
            let sum = 0;
            for (let j = 0; j < period; j++) {
                sum += data[i - j];
            }
            result.push(sum / period);
        }
    }
    
    return result;
}

/**
 * Calcula as Bandas de Bollinger
 * @param {Array} data - Array de dados de preço
 * @param {number} period - Período das bandas
 * @param {number} multiplier - Multiplicador para o desvio padrão
 * @returns {Object} - Objeto com as bandas superior e inferior
 */
function calculateBollingerBands(data, period, multiplier) {
    const ma = calculateMA(data, period);
    const upper = [];
    const lower = [];
    
    // Implementação simplificada das bandas de Bollinger
    for (let i = 0; i < data.length; i++) {
        if (i < period - 1) {
            upper.push(null);
            lower.push(null);
        } else {
            let sum = 0;
            for (let j = 0; j < period; j++) {
                sum += Math.pow(data[i - j] - ma[i], 2);
            }
            const stdDev = Math.sqrt(sum / period);
            upper.push(ma[i] + (multiplier * stdDev));
            lower.push(ma[i] - (multiplier * stdDev));
        }
    }
    
    return { upper, lower };
}

/**
 * Determina a unidade de tempo adequada com base na quantidade de dados
 * @param {number} dataLength - Quantidade de pontos de dados
 * @returns {string} - Unidade de tempo para o eixo X
 */
function getTimeUnit(dataLength) {
    if (dataLength <= 24) {
        return 'hour';
    } else if (dataLength <= 31) {
        return 'day';
    } else if (dataLength <= 365) {
        return 'month';
    } else {
        return 'year';
    }
}

/**
 * Controla a exibição do indicador de carregamento
 * @param {boolean} show - Indica se o indicador deve ser exibido
 */
function showLoading(show) {
    loadingIndicator.style.display = show ? 'flex' : 'none';
    errorContainer.style.display = 'none';
    
    if (show) {
        cryptoGrid.innerHTML = '';
    }
}

/**
 * Exibe uma mensagem de erro na interface
 * @param {string} message - Mensagem de erro a ser exibida
 */
function showError(message) {
    loadingIndicator.style.display = 'none';
    errorContainer.style.display = 'flex';
    errorMessage.textContent = message;
}

/**
 * Atualiza o tempo da última atualização
 * @param {Date} date - Data da última atualização
 */
function updateLastUpdatedTime(date) {
    const lastUpdatedElement = document.getElementById('lastUpdated');
    if (lastUpdatedElement) {
        lastUpdatedElement.textContent = `Última atualização: ${date.toLocaleTimeString()}`;
    }
}

// Inicializa a aplicação quando o DOM estiver carregado
document.addEventListener('DOMContentLoaded', () => {
    // Verifica se todos os elementos do DOM foram encontrados
    if (!cryptoGrid || !loadingIndicator || !errorContainer || !errorMessage || 
        !searchInput || !searchBtn || !refreshBtn || !retryBtn || !currencySelect) {
        console.error('Erro: Alguns elementos do DOM não foram encontrados!');
        alert('Erro ao inicializar a aplicação. Verifique o console para mais detalhes.');
        return;
    }
    
    // Se todos os elementos foram encontrados, inicializa a aplicação
    init();
});
