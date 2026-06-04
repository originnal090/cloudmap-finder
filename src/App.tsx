import { useEffect, useMemo, useState } from "react";

type WeatherLayer = {
  label: string;
  value: string;
  description: string;
};

type SearchHistoryItem = {
  place: string;
  lat: number;
  lon: number;
  displayName: string;
  searchedAt: string;
};

const HISTORY_STORAGE_KEY = "cloudmap-search-history";
const THEME_STORAGE_KEY = "cloudmap-theme";
const DEFAULT_CITY_STORAGE_KEY = "cloudmap-default-city";
const DEFAULT_ZOOM = 7;
const FALLBACK_DEFAULT_CITY = "London";

const WEATHER_LAYERS: WeatherLayer[] = [
  {
    label: "卫星云图",
    value: "satellite",
    description: "适合查看真实云系分布",
  },
  {
    label: "天气雷达",
    value: "radar",
    description: "适合查看实时降雨回波",
  },
  {
    label: "温度",
    value: "temperature",
    description: "查看地表附近气温",
  },
  {
    label: "体感温度",
    value: "feel",
    description: "查看人体感受到的温度",
  },
  {
    label: "降水量",
    value: "rain-3h",
    description: "查看未来或当前降水分布",
  },
  {
    label: "云量",
    value: "clouds",
    description: "查看云层覆盖情况",
  },
  {
    label: "风速",
    value: "wind",
    description: "查看风场和风速",
  },
  {
    label: "气压",
    value: "pressure",
    description: "查看海平面气压分布",
  },
  {
    label: "湿度",
    value: "humidity",
    description: "查看空气湿度分布",
  },
];

async function geocode(place: string) {
  const url =
    `https://nominatim.openstreetmap.org/search?` +
    new URLSearchParams({
      q: place,
      format: "json",
      limit: "1",
    });

  const res = await fetch(url, {
    headers: {
      Accept: "application/json",
    },
  });

  if (!res.ok) {
    throw new Error("位置查询失败，请稍后再试。");
  }

  const data = await res.json();

  if (!data.length) {
    throw new Error("找不到这个位置，请换一个更具体的名称。");
  }

  return {
    lat: Number(data[0].lat),
    lon: Number(data[0].lon),
    name: data[0].display_name,
  };
}

function buildVentuskyUrl(
  lat: number,
  lon: number,
  label: string,
  layer: string,
  embed: boolean
) {
  const params = new URLSearchParams({
    p: `${lat};${lon};${DEFAULT_ZOOM}`,
    l: layer,
    pin: `${lat};${lon};dot;${label}`,
  });

  const baseUrl = embed
    ? "https://embed.ventusky.com/"
    : "https://www.ventusky.com/";

  return `${baseUrl}?${params.toString()}`;
}

function loadSearchHistory(): SearchHistoryItem[] {
  try {
    const raw = localStorage.getItem(HISTORY_STORAGE_KEY);
    if (!raw) return [];

    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];

    return parsed;
  } catch {
    return [];
  }
}

function saveSearchHistory(history: SearchHistoryItem[]) {
  localStorage.setItem(HISTORY_STORAGE_KEY, JSON.stringify(history));
}

type ThemeMode = "system" | "light" | "dark";

function loadTheme(): ThemeMode {
  const savedTheme = localStorage.getItem(THEME_STORAGE_KEY);

  if (savedTheme === "system" || savedTheme === "dark" || savedTheme === "light") {
    return savedTheme;
  }

  return "system";
}

function loadDefaultCity() {
  return localStorage.getItem(DEFAULT_CITY_STORAGE_KEY) || FALLBACK_DEFAULT_CITY;
}

export default function App() {
  const [defaultCity, setDefaultCity] = useState(FALLBACK_DEFAULT_CITY);
  const [defaultCityInput, setDefaultCityInput] = useState(FALLBACK_DEFAULT_CITY);

  const [place, setPlace] = useState(FALLBACK_DEFAULT_CITY);
  const [lat, setLat] = useState<number | null>(null);
  const [lon, setLon] = useState<number | null>(null);
  const [locationLabel, setLocationLabel] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [selectedLayer, setSelectedLayer] = useState("satellite");
  const [mapUrl, setMapUrl] = useState("");
  const [status, setStatus] = useState("请输入一个地点，或者使用默认城市。");
  const [history, setHistory] = useState<SearchHistoryItem[]>([]);

  const [theme, setTheme] = useState<ThemeMode>("system");
  const [systemPrefersDark, setSystemPrefersDark] = useState(false);

  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    const savedDefaultCity = loadDefaultCity();

    setDefaultCity(savedDefaultCity);
    setDefaultCityInput(savedDefaultCity);
    setPlace(savedDefaultCity);

    setHistory(loadSearchHistory());
    setTheme(loadTheme());
  }, []);

useEffect(() => {
  localStorage.setItem(THEME_STORAGE_KEY, theme);
}, [theme]);

useEffect(() => {
  const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");

  function handleSystemThemeChange(event: MediaQueryListEvent) {
    setSystemPrefersDark(event.matches);
  }

  setSystemPrefersDark(mediaQuery.matches);
  mediaQuery.addEventListener("change", handleSystemThemeChange);

  return () => {
    mediaQuery.removeEventListener("change", handleSystemThemeChange);
  };
}, []);

const isDark = theme === "dark" || (theme === "system" && systemPrefersDark);

  const colors = useMemo(
    () => ({
      pageBg: isDark ? "#020617" : "#f3f6fb",
      cardBg: isDark ? "#0f172a" : "#ffffff",
      panelBg: isDark ? "#111827" : "#f8fafc",
      inputBg: isDark ? "#020617" : "#ffffff",
      text: isDark ? "#f8fafc" : "#111827",
      heading: isDark ? "#ffffff" : "#111827",
      mutedText: isDark ? "#cbd5e1" : "#4b5563",
      weakText: isDark ? "#94a3b8" : "#64748b",
      border: isDark ? "#334155" : "#e5e7eb",
      buttonBg: "#2563eb",
      buttonText: "#ffffff",
      secondaryButtonBg: isDark ? "#1e293b" : "#ffffff",
      secondaryButtonText: isDark ? "#f8fafc" : "#111827",
      activeSoft: isDark ? "#1d4ed8" : "#dbeafe",
      dangerBg: isDark ? "#7f1d1d" : "#fee2e2",
      dangerText: isDark ? "#fecaca" : "#991b1b",
    }),
    [isDark]
  );

  const currentLayer = useMemo(() => {
    return (
      WEATHER_LAYERS.find((layer) => layer.value === selectedLayer) ??
      WEATHER_LAYERS[0]
    );
  }, [selectedLayer]);

  const originalVentuskyUrl =
    lat !== null && lon !== null
      ? buildVentuskyUrl(lat, lon, locationLabel || place, selectedLayer, false)
      : "";

  function updateMap(
    nextLat: number,
    nextLon: number,
    nextLabel: string,
    nextLayer: string
  ) {
    const url = buildVentuskyUrl(nextLat, nextLon, nextLabel, nextLayer, true);
    setMapUrl(url);
  }

  function addToHistory(item: SearchHistoryItem) {
    const nextHistory = [
      item,
      ...history.filter(
        (oldItem) =>
          oldItem.place.toLowerCase() !== item.place.toLowerCase() &&
          oldItem.displayName !== item.displayName
      ),
    ].slice(0, 8);

    setHistory(nextHistory);
    saveSearchHistory(nextHistory);
  }

  async function handleSearch(searchPlace = place) {
    const trimmedPlace = searchPlace.trim();

    if (!trimmedPlace) {
      setStatus("请先输入一个地点。");
      return;
    }

    try {
      setIsLoading(true);
      setStatus("正在查找位置...");

      const result = await geocode(trimmedPlace);

      setLat(result.lat);
      setLon(result.lon);
      setLocationLabel(trimmedPlace);
      setDisplayName(result.name);
      setPlace(trimmedPlace);

      updateMap(result.lat, result.lon, trimmedPlace, selectedLayer);

      const historyItem: SearchHistoryItem = {
        place: trimmedPlace,
        lat: result.lat,
        lon: result.lon,
        displayName: result.name,
        searchedAt: new Date().toISOString(),
      };

      addToHistory(historyItem);

      setStatus(`已定位：${result.name}`);
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "发生未知错误。");
    } finally {
      setIsLoading(false);
    }
  }

  function handleLayerChange(layerValue: string) {
    setSelectedLayer(layerValue);

    if (lat !== null && lon !== null) {
      updateMap(lat, lon, locationLabel || place, layerValue);
    }
  }

  function handleHistoryClick(item: SearchHistoryItem) {
    setPlace(item.place);
    setLat(item.lat);
    setLon(item.lon);
    setLocationLabel(item.place);
    setDisplayName(item.displayName);

    updateMap(item.lat, item.lon, item.place, selectedLayer);
    setStatus(`已从最近搜索打开：${item.displayName}`);
  }

  function handleUseDefaultCity() {
    handleSearch(defaultCity);
  }

  function handleSaveDefaultCity() {
    const trimmedDefaultCity = defaultCityInput.trim();

    if (!trimmedDefaultCity) {
      setStatus("默认城市不能为空。");
      return;
    }

    localStorage.setItem(DEFAULT_CITY_STORAGE_KEY, trimmedDefaultCity);
    setDefaultCity(trimmedDefaultCity);
    setPlace(trimmedDefaultCity);
    setStatus(`默认城市已修改为：${trimmedDefaultCity}`);
  }

  function handleSetCurrentAsDefaultCity() {
    const currentPlace = place.trim();

    if (!currentPlace) {
      setStatus("当前输入框没有地点，不能设置为默认城市。");
      return;
    }

    localStorage.setItem(DEFAULT_CITY_STORAGE_KEY, currentPlace);
    setDefaultCity(currentPlace);
    setDefaultCityInput(currentPlace);
    setStatus(`已把当前地点设置为默认城市：${currentPlace}`);
  }

  function handleClearHistory() {
    setHistory([]);
    saveSearchHistory([]);
  }

  function handleOpenOriginalVentusky() {
    if (!originalVentuskyUrl) {
      setStatus("请先搜索一个地点，然后再打开 Ventusky 原网页。");
      return;
    }

    window.open(originalVentuskyUrl, "_blank", "noopener,noreferrer");
  }

  function openExternalUrl(url: string) {
  window.open(url, "_blank", "noopener,noreferrer");
}

function openJmaTyphoonInfo() {
  openExternalUrl("https://www.jma.go.jp/bosai/map.html#contents=typhoon");
}

function openHkoTyphoonTrack() {
  openExternalUrl(
    "https://www.hko.gov.hk/en/wxinfo/currwx/tc_pos.htm"
  );
}

function openNoaaNhc() {
  openExternalUrl("https://www.nhc.noaa.gov/");
}

function openVentuskyWindLayer() {
  if (lat === null || lon === null) {
    setStatus("请先搜索一个地点，再查看该地区附近的台风风场。");
    return;
  }

  setSelectedLayer("wind");
  updateMap(lat, lon, locationLabel || place, "wind");
  setStatus("已切换到风速图层，可用于观察台风外围风场。");
}

function openVentuskyRadarLayer() {
  if (lat === null || lon === null) {
    setStatus("请先搜索一个地点，再查看该地区附近的雷达降雨。");
    return;
  }

  setSelectedLayer("radar");
  updateMap(lat, lon, locationLabel || place, "radar");
  setStatus("已切换到天气雷达图层，可用于观察降雨回波。");
}

  const inputStyle = {
    padding: "12px 14px",
    border: `1px solid ${colors.border}`,
    borderRadius: 10,
    fontSize: 16,
    background: colors.inputBg,
    color: colors.text,
    outline: "none",
  };

  const secondaryButtonStyle = {
    padding: "12px 18px",
    borderRadius: 10,
    border: `1px solid ${colors.border}`,
    background: colors.secondaryButtonBg,
    color: colors.secondaryButtonText,
    fontSize: 16,
    cursor: "pointer",
  };

  return (
    <main
      style={{
        fontFamily: "Arial, sans-serif",
        minHeight: "100vh",
        background: colors.pageBg,
        color: colors.text,
        padding: 24,
        transition: "background 0.2s ease, color 0.2s ease",
      }}
    >
      <section
        style={{
          maxWidth: 1200,
          margin: "0 auto",
          background: colors.cardBg,
          color: colors.text,
          borderRadius: 18,
          padding: 24,
          boxShadow: isDark
            ? "0 10px 30px rgba(0, 0, 0, 0.4)"
            : "0 10px 30px rgba(0, 0, 0, 0.08)",
          border: `1px solid ${colors.border}`,
        }}
      >
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            gap: 16,
            alignItems: "center",
            flexWrap: "wrap",
          }}
        >
          <div>
            <h1
              style={{
                marginTop: 0,
                marginBottom: 8,
                fontSize: 42,
                color: colors.heading,
              }}
            >
              天气云图查看器
            </h1>

            <p style={{ color: colors.mutedText, fontSize: 16, marginTop: 0 }}>
              输入城市或地点，查看 Ventusky 互动天气地图。
            </p>
          </div>

          <select
  value={theme}
  onChange={(e) => setTheme(e.target.value as ThemeMode)}
  style={{
    ...secondaryButtonStyle,
    appearance: "none",
  }}
>
  <option value="system">跟随系统</option>
  <option value="light">浅色模式</option>
  <option value="dark">深色模式</option>
</select>
  </div>
        <div
          style={{
            display: "flex",
            gap: 8,
            marginBottom: 12,
            flexWrap: "wrap",
          }}
        >
          <input
            value={place}
            onChange={(e) => setPlace(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                handleSearch();
              }
            }}
            placeholder="输入城市或地点，例如 London"
            style={{
              ...inputStyle,
              width: 360,
              maxWidth: "100%",
            }}
          />

          <button
            onClick={() => handleSearch()}
            disabled={isLoading}
            style={{
              padding: "12px 18px",
              border: "none",
              borderRadius: 10,
              background: isLoading ? "#94a3b8" : colors.buttonBg,
              color: colors.buttonText,
              fontSize: 16,
              cursor: isLoading ? "not-allowed" : "pointer",
            }}
          >
            {isLoading ? "查询中..." : "查看天气地图"}
          </button>

          <button onClick={handleUseDefaultCity} style={secondaryButtonStyle}>
            使用默认城市：{defaultCity}
          </button>

          <button
            onClick={handleOpenOriginalVentusky}
            style={secondaryButtonStyle}
          >
            打开 Ventusky 原网页
          </button>
        </div>

        <div
          style={{
            background: colors.panelBg,
            color: colors.text,
            border: `1px solid ${colors.border}`,
            borderRadius: 12,
            padding: 12,
            marginBottom: 16,
          }}
        >
          <strong style={{ color: colors.heading }}>默认城市设置</strong>

          <div
            style={{
              display: "flex",
              gap: 8,
              marginTop: 10,
              flexWrap: "wrap",
            }}
          >
            <input
              value={defaultCityInput}
              onChange={(e) => setDefaultCityInput(e.target.value)}
              placeholder="设置默认城市，例如 Shanghai"
              style={{
                ...inputStyle,
                width: 300,
                maxWidth: "100%",
              }}
            />

            <button onClick={handleSaveDefaultCity} style={secondaryButtonStyle}>
              保存默认城市
            </button>

            <button
              onClick={handleSetCurrentAsDefaultCity}
              style={secondaryButtonStyle}
            >
              把当前输入设为默认城市
            </button>
          </div>

          <div style={{ color: colors.weakText, marginTop: 8 }}>
            当前默认城市：{defaultCity}
          </div>
        </div>

        <div
          style={{
            display: "flex",
            gap: 8,
            flexWrap: "wrap",
            marginBottom: 16,
          }}
        >
          {WEATHER_LAYERS.map((layer) => (
            <button
              key={layer.value}
              onClick={() => handleLayerChange(layer.value)}
              style={{
                padding: "10px 14px",
                borderRadius: 999,
                border:
                  selectedLayer === layer.value
                    ? "1px solid #2563eb"
                    : `1px solid ${colors.border}`,
                background:
                  selectedLayer === layer.value
                    ? "#2563eb"
                    : colors.secondaryButtonBg,
                color:
                  selectedLayer === layer.value
                    ? "#ffffff"
                    : colors.secondaryButtonText,
                cursor: "pointer",
              }}
            >
              {layer.label}
            </button>
          ))}
        </div>

        <div
          style={{
            background: colors.panelBg,
            color: colors.text,
            border: `1px solid ${colors.border}`,
            borderRadius: 12,
            padding: 12,
            marginBottom: 16,
          }}
        >
          <strong style={{ color: colors.heading }}>
            当前图层：{currentLayer.label}
          </strong>

          <div style={{ color: colors.mutedText, marginTop: 4 }}>
            {currentLayer.description}
          </div>

          {displayName && (
            <div style={{ color: colors.mutedText, marginTop: 8 }}>
              当前地点：{displayName}
            </div>
          )}
        </div>

         <div
          style={{
            background: colors.panelBg,
            color: colors.text,
            border: `1px solid ${colors.border}`,
            borderRadius: 12,
            padding: 12,
            marginBottom: 16,
          }}
        >
          <strong style={{ color: colors.heading }}>台风追踪工具</strong>

          <div style={{ color: colors.mutedText, marginTop: 6 }}>
            快速查看官方台风路径信息，或切换当前地图到风速 / 雷达图层。
          </div>

          <div
            style={{
              display: "flex",
              gap: 8,
              flexWrap: "wrap",
              marginTop: 12,
            }}
          >
            <button onClick={openJmaTyphoonInfo} style={secondaryButtonStyle}>
              打开 JMA 台风信息
            </button>

            <button onClick={openHkoTyphoonTrack} style={secondaryButtonStyle}>
              打开 HKO 台风路径
            </button>

            <button onClick={openNoaaNhc} style={secondaryButtonStyle}>
              打开 NOAA/NHC
            </button>

            <button onClick={openVentuskyWindLayer} style={secondaryButtonStyle}>
              当前地点看风速
            </button>

            <button
              onClick={openVentuskyRadarLayer}
              style={secondaryButtonStyle}
            >
              当前地点看雷达
            </button>
          </div>
        </div>

        <div
          style={{
            background: colors.panelBg,
            color: colors.text,
            border: `1px solid ${colors.border}`,
            borderRadius: 12,
            padding: 12,
            marginBottom: 16,
          }}
        >
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              gap: 12,
              alignItems: "center",
              flexWrap: "wrap",
              marginBottom: history.length > 0 ? 10 : 0,
            }}
          >
            <strong style={{ color: colors.heading }}>最近搜索记录</strong>

            {history.length > 0 && (
              <button
                onClick={handleClearHistory}
                style={{
                  padding: "6px 10px",
                  borderRadius: 8,
                  border: `1px solid ${colors.border}`,
                  background: colors.dangerBg,
                  color: colors.dangerText,
                  cursor: "pointer",
                }}
              >
                清空记录
              </button>
            )}
          </div>

          {history.length === 0 ? (
            <div style={{ color: colors.mutedText }}>暂无搜索记录。</div>
          ) : (
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              {history.map((item) => (
                <button
                  key={`${item.place}-${item.searchedAt}`}
                  onClick={() => handleHistoryClick(item)}
                  title={item.displayName}
                  style={{
                    padding: "8px 12px",
                    borderRadius: 999,
                    border: `1px solid ${colors.border}`,
                    background:
                      item.place === locationLabel
                        ? colors.activeSoft
                        : colors.secondaryButtonBg,
                    color:
                      item.place === locationLabel
                        ? "#ffffff"
                        : colors.secondaryButtonText,
                    cursor: "pointer",
                    maxWidth: 240,
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    whiteSpace: "nowrap",
                  }}
                >
                  {item.place}
                </button>
              ))}
            </div>
          )}
        </div>

        <p style={{ color: colors.mutedText }}>{status}</p>

        {mapUrl ? (
          <iframe
            title="Ventusky Weather Map"
            src={mapUrl}
            style={{
              width: "100%",
              height: "72vh",
              border: `1px solid ${colors.border}`,
              borderRadius: 16,
              background: colors.panelBg,
            }}
            allowFullScreen
          />
        ) : (
          <div
            style={{
              height: "50vh",
              border: `2px dashed ${colors.border}`,
              borderRadius: 16,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: colors.mutedText,
              fontSize: 18,
              background: colors.panelBg,
              textAlign: "center",
              padding: 24,
            }}
          >
            搜索一个地点后，这里会显示 Ventusky 天气地图。
          </div>
        )}
      </section>
    </main>
  );
}