let mapReady = true;
let weatherInstance = null; // 添加天气实例变量

// 添加分页相关变量
let currentPage = 1;
const PAGE_SIZES = [20, 50, 100];
let currentPageSize = 50;
let totalResults = 0;

// 添加天气搜索函数
async function searchWeather() {
    const weatherSearchBtn = document.getElementById('weatherSearchBtn');
    if (weatherSearchBtn) {
        weatherSearchBtn.disabled = true;
        weatherSearchBtn.style.opacity = '0.6';
        weatherSearchBtn.style.cursor = 'not-allowed';
        weatherSearchBtn.textContent = '查询中...';
    }

    const cityInput = document.getElementById('weatherCity');
    if (!cityInput || !cityInput.value.trim()) {
        alert('请输入要查询天气的城市');
        if (weatherSearchBtn) {
            weatherSearchBtn.disabled = false;
            weatherSearchBtn.style.opacity = '1';
            weatherSearchBtn.style.cursor = 'pointer';
            weatherSearchBtn.textContent = '查询天气';
        }
        return;
    }

    const city = cityInput.value.trim();
    const weatherResultDiv = document.getElementById('weatherResult');
    weatherResultDiv.innerHTML = '<div class="loading">正在查询天气...</div>';
    
    try {
        const weatherInfo = await getWeatherInfo(city);
        if (weatherInfo) {
            const tempDesc = getTemperatureDescription(weatherInfo.temperature);
            weatherResultDiv.innerHTML = `
                <div class="weather-info">
                    <div class="weather-info-header">
                        <div>
                            <div class="weather-info-location">
                                ${weatherInfo.city || city}
                            </div>
                            <div class="weather-info-time">
                                发布时间：${weatherInfo.reporttime || '-'}
                            </div>
                        </div>
                        <div class="weather-info-temperature">
                            <div class="temp-number">温度 ${weatherInfo.temperature || '-'}度</div>
                            <div class="temp-desc">${tempDesc}</div>
                        </div>
                    </div>
                    <div class="weather-info-main">
                        <div class="weather-info-item">
                            <span class="weather-icon">🌤️</span>
                            <div>
                                <div class="label">天气状况</div>
                                <div class="value">${weatherInfo.weather || '-'}</div>
                            </div>
                        </div>
                        <div class="weather-info-item">
                            <span class="weather-icon">💨</span>
                            <div>
                                <div class="label">风向</div>
                                <div class="value">${weatherInfo.winddirection || '-'}</div>
                            </div>
                        </div>
                        <div class="weather-info-item">
                            <span class="weather-icon">🌪️</span>
                            <div>
                                <div class="label">风力</div>
                                <div class="value">${weatherInfo.windpower || '-'}级</div>
                            </div>
                        </div>
                        <div class="weather-info-item">
                            <span class="weather-icon">💧</span>
                            <div>
                                <div class="label">空气湿度</div>
                                <div class="value">${weatherInfo.humidity || '-'}%</div>
                            </div>
                        </div>
                    </div>
                </div>
            `;
        } else {
            weatherResultDiv.innerHTML = '<div class="error">获取天气信息失败，请检查城市名称是否正确</div>';
        }
    } catch (error) {
        console.error('天气查询失败:', error);
        let errorMessage = '网络连接失败，请检查网络后重试';
        
        if (error.message.includes('Failed to fetch')) {
            errorMessage = '网络连接失败，请检查网络后重试';
        } else if (error.message.includes('timeout')) {
            errorMessage = '请求超时，请稍后重试';
        } else if (error.message.includes('Network Error')) {
            errorMessage = '网络错误，请检查网络连接';
        } else if (error.response && error.response.status === 404) {
            errorMessage = '未找到该城市的天气信息';
        } else if (error.response && error.response.status === 401) {
            errorMessage = '天气服务授权失败，请联系管理员';
        } else {
            errorMessage = '天气查询失败，请稍后重试';
        }
        
        weatherResultDiv.innerHTML = `
            <div class="error">
                <div style="margin-bottom: 10px;">${errorMessage}</div>
                <button onclick="searchWeather()" class="retry-button">
                    重新查询
                </button>
            </div>
        `;
    } finally {
        // 无论成功还是失败，都要恢复按钮状态
        if (weatherSearchBtn) {
            weatherSearchBtn.disabled = false;
            weatherSearchBtn.style.opacity = '1';
            weatherSearchBtn.style.cursor = 'pointer';
            weatherSearchBtn.textContent = '查询天气';
        }
    }
}

// 修改初始化页面函数
function initPage() {
    const searchButton = document.querySelector('.search-box button');
    if (searchButton) {
        searchButton.disabled = false;
        searchButton.textContent = '搜索';
    }

    const weatherSearchButton = document.getElementById('weatherSearchBtn');
    if (weatherSearchButton) {
        weatherSearchButton.addEventListener('click', searchWeather);
    }
}

// 修改获取天气信息的函数
function getWeatherInfo(city) {
    return new Promise(async (resolve, reject) => {
        try {
            const controller = new AbortController();
            const timeoutId = setTimeout(() => {
                controller.abort();
                reject(new Error('timeout'));
            }, 10000); // 10秒超时

            // 构建天气查询 API URL
            const apiUrl = new URL('https://restapi.amap.com/v3/weather/weatherInfo');
            const params = {
                city: city,
                key: '56b3fdd0d5f18689db37ec9630c9d40f',
                extensions: 'base'
            };
            
            Object.keys(params).forEach(key => 
                apiUrl.searchParams.append(key, params[key])
            );

            const response = await fetch(apiUrl, {
                signal: controller.signal,
                method: 'GET',
                headers: {
                    'Accept': 'application/json'
                }
            });

            clearTimeout(timeoutId);

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            
            const data = await response.json();
            
            if (data.status === '1' && data.lives && data.lives.length > 0) {
                console.log('获取天气信息成功:', data.lives[0]);
                resolve(data.lives[0]);
            } else {
                console.error('天气查询失败:', data);
                reject(new Error(data.info || '获取天气信息失败'));
            }
        } catch (error) {
            console.error('天气查询请求失败:', error);
            reject(error);
        }
    });
}

// 添加类型选择处理
document.addEventListener('DOMContentLoaded', function() {
    const typeSelect = document.getElementById('locationType');
    const customTypeInput = document.getElementById('customType');

    // 监听类型选择变化
    typeSelect.addEventListener('change', function() {
        if (this.value === 'custom') {
            customTypeInput.style.display = 'block';
            typeSelect.style.display = 'none';
            customTypeInput.focus();
        } else {
            customTypeInput.style.display = 'none';
            typeSelect.style.display = 'block';
            customTypeInput.value = '';
        }
    });

    // 添加自定义类型输入框的失焦处理
    customTypeInput.addEventListener('blur', function() {
        if (!this.value.trim()) {
            typeSelect.value = '';
            typeSelect.style.display = 'block';
            this.style.display = 'none';
        }
    });
});

// 修改搜索函数
async function searchRestaurants(page = 1) {
    const searchButton = document.querySelector('.search-box button');
    if (searchButton) {
        searchButton.disabled = true;
        searchButton.textContent = '搜索中...';
    }

    const location = document.getElementById('location').value.trim();
    const typeSelect = document.getElementById('locationType');
    const customTypeInput = document.getElementById('customType');
    
    // 获取类型值
    let locationType = typeSelect.value;
    if (locationType === 'custom') {
        locationType = customTypeInput.value.trim();
    }

    if (!location) {
        alert('请输入地区');
        if (searchButton) {
            searchButton.disabled = false;
            searchButton.textContent = '搜索';
        }
        return;
    }

    if (!locationType) {
        alert('请选择或输入地址类型');
        if (searchButton) {
            searchButton.disabled = false;
            searchButton.textContent = '搜索';
        }
        return;
    }

    const resultsDiv = document.getElementById('results');
    resultsDiv.innerHTML = '<div class="loading">正在搜索...</div>';

    try {
        const apiUrl = new URL('https://restapi.amap.com/v3/place/text');
        const params = {
            keywords: location,
            city: 'beijing',
            offset: 50,
            page: page,
            key: '56b3fdd0d5f18689db37ec9630c9d40f',
            extensions: 'all',
            types: locationType
        };
        
        Object.keys(params).forEach(key => 
            apiUrl.searchParams.append(key, params[key])
        );

        console.log('发送搜索请求:', apiUrl.toString());

        const response = await fetch(apiUrl);
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const data = await response.json();
        console.log('API 响应数据:', data);

        if (data.status === '1') {
            if (data.pois && data.pois.length > 0) {
                console.log('找到地点:', data.pois);
                totalResults = parseInt(data.count);
                displayResults(data.pois);
                displayPagination();
            } else {
                console.log('API 返回空结果');
                resultsDiv.innerHTML = `
                    <div class="no-results">
                        <div class="no-results-title">未找到符合条件的地点</div>
                        <div class="no-results-text">
                            很抱歉，我们没有找到符合您搜索条件的地点。
                        </div>
                        <div class="no-results-suggestions">
                            <strong>您可以尝试：</strong>
                            <ul>
                                <li>检查输入的地区名称是否正确</li>
                                <li>尝试使用不同的地址类型</li>
                                <li>扩大搜索范围</li>
                                <li>使用更通用的关键词</li>
                            </ul>
                        </div>
                    </div>`;
            }
        } else {
            console.error('API 返回错误:', data.info);
            if (data.infocode === '10003' || data.info.includes('OVER_LIMIT')) {
                resultsDiv.innerHTML = `
                    <div class="api-limit-error">
                        <div class="error-icon">⚠️</div>
                        <div class="error-title">搜索次数已达到今日限制</div>
                        <div class="error-message">
                            抱歉，由于使用人数较多，当前搜索服务已达到今日使用限制。
                        </div>
                        <div class="error-suggestions">
                            <ul>
                                <li>您可以稍后再试</li>
                                <li>或者等到明天再来使用</li>
                                <li>建议在使用高峰期避开整点时间</li>
                            </ul>
                        </div>
                        <div class="error-actions">
                            <button onclick="searchRestaurants(1)" class="retry-button">
                                <i class="fas fa-redo"></i> 重新尝试
                            </button>
                            <button onclick="window.location.reload()" class="refresh-button">
                                <i class="fas fa-sync"></i> 刷新页面
                            </button>
                        </div>
                    </div>`;
            } else {
                throw new Error(data.info || '搜索失败');
            }
        }

        if (searchButton) {
            searchButton.disabled = false;
            searchButton.textContent = '搜索';
        }
    } catch (error) {
        console.error('搜索请求失败:', error);
        if (searchButton) {
            searchButton.disabled = false;
            searchButton.textContent = '搜索';
        }
        resultsDiv.innerHTML = `
            <div class="error">
                <div style="margin-bottom: 10px;">搜索失败: ${error.message}</div>
                <button onclick="searchRestaurants(1)" class="retry-button">
                    重新搜索
                </button>
            </div>`;
    }
}

// 修改显示结果函数
function displayResults(places, startTime, endTime) {
    const resultsDiv = document.getElementById('results');
    resultsDiv.innerHTML = '';

    // 添加结果统计和分页大小选择
    const controlsDiv = document.createElement('div');
    controlsDiv.className = 'results-controls';
    
    // 显示结果统计
    const statsDiv = document.createElement('div');
    statsDiv.className = 'results-stats';
    statsDiv.textContent = `共找到 ${totalResults} 个地点`;
    
    // 添加每页显示数量选择
    const pageSizeSelect = document.createElement('select');
    pageSizeSelect.className = 'page-size-select';
    PAGE_SIZES.forEach(size => {
        const option = document.createElement('option');
        option.value = size;
        option.text = `每页 ${size} 条`;
        option.selected = size === currentPageSize;
        pageSizeSelect.appendChild(option);
    });
    
    pageSizeSelect.addEventListener('change', (e) => {
        currentPageSize = parseInt(e.target.value);
        searchRestaurants(1);
    });

    controlsDiv.appendChild(statsDiv);
    controlsDiv.appendChild(pageSizeSelect);
    
    // 只在有结果时显示控制栏
    if (places && places.length > 0) {
        resultsDiv.appendChild(controlsDiv);
    }

    // 显示地点列表
    const placesDiv = document.createElement('div');
    placesDiv.className = 'restaurants-list';
    
    if (!places || places.length === 0) {
        placesDiv.innerHTML = `
            <div class="no-results">
                <div class="no-results-title">未找到符合条件的地点</div>
                <div class="no-results-text">
                    很抱歉，我们没有找到符合您搜索条件的地点。
                </div>
                <div class="no-results-suggestions">
                    <strong>您可以尝试：</strong>
                    <ul>
                        <li>检查输入的地区名称是否正确</li>
                        <li>尝试使用不同的地址类型</li>
                        <li>扩大搜索范围</li>
                        <li>使用更通用的关键词</li>
                    </ul>
                </div>
            </div>`;
    } else {
        places.forEach(place => {
            const card = createPlaceCard(place, startTime, endTime);
            placesDiv.appendChild(card);
        });
    }

    resultsDiv.appendChild(placesDiv);
}

// 修改创建卡片函数
function createPlaceCard(place) {
    const card = document.createElement('div');
    card.className = 'restaurant-card';

    // 名称
    const name = document.createElement('h3');
    name.textContent = place.name;
    card.appendChild(name);

    // 图片
    if (place.photos && Array.isArray(place.photos) && place.photos.length > 0) {
        const imageContainer = document.createElement('div');
        imageContainer.className = 'restaurant-image';
        const image = document.createElement('img');
        image.src = place.photos[0].url;
        image.alt = place.name;
        image.onerror = function() {
            imageContainer.style.display = 'none';
        };
        imageContainer.appendChild(image);
        card.appendChild(imageContainer);
    }

    // 评分和人均消费信息容器
    const infoContainer = document.createElement('div');
    infoContainer.className = 'info-container';

    // 评分
    if (place.biz_ext && place.biz_ext.rating) {
        const ratingContainer = document.createElement('div');
        ratingContainer.className = 'rating-container';
        
        const ratingIcon = document.createElement('i');
        ratingIcon.className = 'fas fa-star';
        
        const ratingText = document.createElement('span');
        ratingText.className = 'rating-score';
        ratingText.textContent = `${place.biz_ext.rating}分`;
        
        ratingContainer.appendChild(ratingIcon);
        ratingContainer.appendChild(ratingText);
        infoContainer.appendChild(ratingContainer);
    }

    // 人均消费
    if (place.biz_ext && place.biz_ext.cost) {
        const costContainer = document.createElement('div');
        costContainer.className = 'cost-container';
        
        const costIcon = document.createElement('i');
        costIcon.className = 'fas fa-yen-sign';
        
        const costText = document.createElement('span');
        costText.className = 'cost-value';
        costText.textContent = `${place.biz_ext.cost}/人`;
        
        costContainer.appendChild(costIcon);
        costContainer.appendChild(costText);
        infoContainer.appendChild(costContainer);
    }

    if (infoContainer.children.length > 0) {
        card.appendChild(infoContainer);
    }

    // 地址
    if (place.address) {
        const address = document.createElement('p');
        address.className = 'address';
        address.innerHTML = `<span class="label">地址：</span>${place.address}`;
        card.appendChild(address);
    }

    // 类型
    if (place.type) {
        const type = document.createElement('p');
        type.className = 'type';
        type.innerHTML = `<span class="label">类型：</span>${place.type}`;
        card.appendChild(type);
    }

    // 标签/特色
    if (place.tag) {
        const features = document.createElement('div');
        features.className = 'restaurant-features';
        features.innerHTML = `<span class="label">特色：</span>`;
        
        const tagsList = document.createElement('div');
        tagsList.className = 'features-list';
        
        try {
            // 确保 tag 是字符串
            const tagStr = String(place.tag);
            const tags = tagStr.includes(';') ? tagStr.split(';') : [tagStr];
            
            tags.forEach(tag => {
                if (tag && tag.trim()) {
                    const tagSpan = document.createElement('span');
                    tagSpan.className = 'feature-tag';
                    tagSpan.textContent = tag.trim();
                    tagsList.appendChild(tagSpan);
                }
            });
            
            if (tagsList.children.length > 0) {
                features.appendChild(tagsList);
                card.appendChild(features);
            }
        } catch (error) {
            console.error('处理标签出错:', error);
        }
    }

    // 联系电话
    if (place.tel) {
        const tel = document.createElement('p');
        tel.className = 'tel';
        tel.innerHTML = `<span class="label">电话：</span>${place.tel}`;
        card.appendChild(tel);
    }

    return card;
}

// 添加时钟更新函数
function updateClock() {
    const now = new Date();
    
    // 更新时间
    const hours = String(now.getHours()).padStart(2, '0');
    const minutes = String(now.getMinutes()).padStart(2, '0');
    const seconds = String(now.getSeconds()).padStart(2, '0');
    document.getElementById('currentTime').textContent = `${hours}:${minutes}:${seconds}`;
    
    // 更新日期
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const date = String(now.getDate()).padStart(2, '0');
    document.getElementById('currentDate').textContent = `${year}年${month}月${date}日`;
    
    // 更新星期
    const weekDays = ['日', '一', '二', '三', '四', '五', '六'];
    const weekDay = weekDays[now.getDay()];
    document.getElementById('currentWeek').textContent = `星期${weekDay}`;
}

// 初始化时钟
updateClock();
// 每秒更新时钟
setInterval(updateClock, 1000);

// 确保页面加载完成后初始化
document.addEventListener('DOMContentLoaded', initPage);

// 修改错误处理
window.onerror = function(msg, url, line, col, error) {
    console.error('页面错误:', {msg, url, line, col, error});
    
    // 获取更具体的错误信息
    let errorMessage = '抱歉，出现了一些问题';
    
    if (error && error.message) {
        // 根据不同的错误类型显示不同的提示
        if (error.message.includes('NetworkError') || error.message.includes('Failed to fetch')) {
            errorMessage = '网络连接出现问题，请检查您的网络连接并重试';
        } else if (error.message.includes('TypeError')) {
            errorMessage = '数据处理出现问题，请刷新页面重试';
        } else if (error.message.includes('SyntaxError')) {
            errorMessage = '数据格式有误，请联系管理员';
        } else {
            errorMessage = `出现错误：${error.message}`;
        }
    }

    // 在页面上显示错误信息
    const resultsDiv = document.getElementById('results');
    if (resultsDiv) {
        resultsDiv.innerHTML = `
            <div class="error">
                <div style="margin-bottom: 10px;">${errorMessage}</div>
                <button onclick="window.location.reload()" style="padding: 8px 16px; background: #4CAF50; color: white; border: none; border-radius: 4px; cursor: pointer;">
                    刷新页面
                </button>
            </div>
        `;
    }

    // 重置所有按钮状态
    const allButtons = document.querySelectorAll('button');
    allButtons.forEach(button => {
        button.disabled = false;
        if (button.dataset.originalText) {
            button.textContent = button.dataset.originalText;
        }
    });

    // 清除任何可能的加载状态
    const loadingElements = document.querySelectorAll('.loading');
    loadingElements.forEach(element => {
        element.style.display = 'none';
    });

    return false; // 防止错误继续冒泡
};

// 添加全局的Promise错误处理
window.addEventListener('unhandledrejection', function(event) {
    console.error('未处理的Promise错误:', event.reason);
    
    let errorMessage = '操作未能完成';
    
    if (event.reason) {
        if (event.reason.message) {
            if (event.reason.message.includes('NetworkError') || event.reason.message.includes('Failed to fetch')) {
                errorMessage = '网络连接出现问题，请检查您的网络连接并重试';
            } else if (event.reason.message.includes('timeout')) {
                errorMessage = '请求超时，请稍后重试';
            } else {
                errorMessage = `操作失败：${event.reason.message}`;
            }
        }
    }

    const resultsDiv = document.getElementById('results');
    if (resultsDiv) {
        resultsDiv.innerHTML = `
            <div class="error">
                <div style="margin-bottom: 10px;">${errorMessage}</div>
                <button onclick="window.location.reload()" style="padding: 8px 16px; background: #4CAF50; color: white; border: none; border-radius: 4px; cursor: pointer;">
                    刷新页面
                </button>
            </div>
        `;
    }

    // 重置所有按钮状态
    const allButtons = document.querySelectorAll('button');
    allButtons.forEach(button => {
        button.disabled = false;
        if (button.dataset.originalText) {
            button.textContent = button.dataset.originalText;
        }
    });
});

// 添加全局的AJAX错误处理
function handleAjaxError(error) {
    console.error('AJAX请求失败:', error);
    
    let errorMessage = '请求失败';
    
    if (error.status === 404) {
        errorMessage = '未找到请求的资源';
    } else if (error.status === 401) {
        errorMessage = '未授权的访问，请重新登录';
    } else if (error.status === 403) {
        errorMessage = '没有权限访问该资源';
    } else if (error.status === 500) {
        errorMessage = '服务器内部错误，请稍后重试';
    } else if (error.status === 0) {
        errorMessage = '网络连接失败，请检查您的网络设置';
    }

    const resultsDiv = document.getElementById('results');
    if (resultsDiv) {
        resultsDiv.innerHTML = `
            <div class="error">
                <div style="margin-bottom: 10px;">${errorMessage}</div>
                <button onclick="window.location.reload()" style="padding: 8px 16px; background: #4CAF50; color: white; border: none; border-radius: 4px; cursor: pointer;">
                    刷新页面
                </button>
            </div>
        `;
    }
}

// 添加显示分页控件的函数
function displayPagination() {
    const totalPages = Math.ceil(totalResults / currentPageSize);
    
    const paginationDiv = document.createElement('div');
    paginationDiv.className = 'pagination';

    // 上一页按钮
    if (currentPage > 1) {
        const prevButton = document.createElement('button');
        prevButton.textContent = '上一页';
        prevButton.onclick = () => searchRestaurants(currentPage - 1);
        paginationDiv.appendChild(prevButton);
    }

    // 页码按钮
    for (let i = 1; i <= totalPages; i++) {
        if (
            i === 1 || // 第一页
            i === totalPages || // 最后一页
            (i >= currentPage - 2 && i <= currentPage + 2) // 当前页附近的页码
        ) {
            const pageButton = document.createElement('button');
            pageButton.textContent = i;
            pageButton.className = i === currentPage ? 'current-page' : '';
            pageButton.onclick = () => searchRestaurants(i);
            paginationDiv.appendChild(pageButton);
        } else if (
            (i === currentPage - 3 && currentPage > 4) ||
            (i === currentPage + 3 && currentPage < totalPages - 3)
        ) {
            // 添加省略号
            const ellipsis = document.createElement('span');
            ellipsis.textContent = '...';
            ellipsis.className = 'ellipsis';
            paginationDiv.appendChild(ellipsis);
        }
    }

    // 下一页按钮
    if (currentPage < totalPages) {
        const nextButton = document.createElement('button');
        nextButton.textContent = '下一页';
        nextButton.onclick = () => searchRestaurants(currentPage + 1);
        paginationDiv.appendChild(nextButton);
    }

    document.getElementById('results').appendChild(paginationDiv);
}

function getTemperatureDescription(temp) {
    const temperature = parseInt(temp);
    if (temperature <= 0) return '严寒';
    if (temperature <= 10) return '寒冷';
    if (temperature <= 15) return '凉爽';
    if (temperature <= 22) return '舒适';
    if (temperature <= 28) return '温暖';
    if (temperature <= 35) return '炎热';
    return '酷热';
} 