import React, { useEffect, useState } from 'react';
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { useAuth } from '../context/AuthContext';
import { soatAPI } from '../api/soat';
import type {
  Bolsa,
  DashboardClientMetrics,
  DashboardMetrics,
  DashboardStats,
  MetricsPreset,
  TipoMotoCCEnum,
} from '../types/index.js';
import { formatCurrency } from '../utils/format';

const PRESETS: { value: MetricsPreset; label: string }[] = [
  { value: 'today', label: 'Hoy' },
  { value: 'week', label: 'Semana actual' },
  { value: 'month', label: 'Mes actual' },
  { value: 'last30', label: 'Últimos 30 días' },
  { value: 'custom', label: 'Rango personalizado' },
];

const PIE_COLORS = ['#2563eb', '#7c3aed', '#10b981', '#f59e0b'];
const CLIENT_TOTAL_BAR_COLOR_BY_TYPE: Record<TipoMotoCCEnum, string> = {
  hasta_99cc: '#2563eb',
  '100_200cc': '#ef4444',
};

const tipoMotoLabel: Record<TipoMotoCCEnum, string> = {
  hasta_99cc: 'Hasta 99cc',
  '100_200cc': '100-200cc',
};

const formatChartDate = (date: string) =>
  new Date(`${date}T00:00:00`).toLocaleDateString('es-CO', {
    day: '2-digit',
    month: 'short',
  });

type ComparisonMode = 'previousPeriod' | 'samePeriodLastYear';

type DashboardMetricsView = {
  preset: string;
  start_date: string;
  end_date: string;
  resumen: {
    soats_expedidos: number;
    recargas_total: number;
    consumo_total: number;
    valor_soat_total?: number;
    ticket_promedio: number;
    comisiones_generadas?: number;
  };
  por_tipo: Array<{
    tipo_moto: TipoMotoCCEnum;
    cantidad: number;
    valor_soat?: number;
    total: number;
    comision?: number;
  }>;
  serie_diaria: Array<{
    fecha: string;
    soats_expedidos: number;
    consumo: number;
    recargas: number;
    comisiones?: number;
  }>;
};

const toDate = (date: string) => new Date(`${date}T00:00:00`);
const toISODate = (date: Date) => date.toISOString().slice(0, 10);

const getComparisonRange = (startDate: string, endDate: string, mode: ComparisonMode) => {
  const currentStart = toDate(startDate);
  const currentEnd = toDate(endDate);
  if (mode === 'samePeriodLastYear') {
    const lastYearStart = new Date(currentStart);
    const lastYearEnd = new Date(currentEnd);
    lastYearStart.setFullYear(lastYearStart.getFullYear() - 1);
    lastYearEnd.setFullYear(lastYearEnd.getFullYear() - 1);
    return {
      start_date: toISODate(lastYearStart),
      end_date: toISODate(lastYearEnd),
    };
  }

  const diffDays = Math.max(1, Math.floor((currentEnd.getTime() - currentStart.getTime()) / (1000 * 60 * 60 * 24)) + 1);
  const previousEnd = new Date(currentStart);
  previousEnd.setDate(previousEnd.getDate() - 1);
  const previousStart = new Date(previousEnd);
  previousStart.setDate(previousStart.getDate() - (diffDays - 1));
  return { start_date: toISODate(previousStart), end_date: toISODate(previousEnd) };
};

const getDeltaPercent = (current: number, previous: number) => {
  if (previous === 0) return current === 0 ? 0 : 100;
  return ((current - previous) / previous) * 100;
};

const getDeltaStyle = (delta: number) => {
  if (delta > 0) return { text: 'text-green-700', bg: 'bg-green-100', icon: '↑' };
  if (delta < 0) return { text: 'text-red-700', bg: 'bg-red-100', icon: '↓' };
  return { text: 'text-gray-700', bg: 'bg-gray-100', icon: '→' };
};

const normalizeAdminMetrics = (data: DashboardMetrics): DashboardMetricsView => data;

const normalizeClientMetrics = (data: DashboardClientMetrics): DashboardMetricsView => data;

const Dashboard: React.FC = () => {
  const { isAdmin } = useAuth();
  const [bolsa, setBolsa] = useState<Bolsa | null>(null);
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [metrics, setMetrics] = useState<DashboardMetricsView | null>(null);
  const [previousMetrics, setPreviousMetrics] = useState<DashboardMetricsView | null>(null);
  const [metricsLoading, setMetricsLoading] = useState(false);
  const [metricsError, setMetricsError] = useState('');
  const [selectedPreset, setSelectedPreset] = useState<MetricsPreset>('month');
  const [comparisonMode, setComparisonMode] = useState<ComparisonMode>('previousPeriod');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [summaryPage, setSummaryPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const summaryItemsPerPage = 10;

  useEffect(() => {
    const timer = setTimeout(() => {
      void loadData();
    }, 100);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (!metrics) return;
    void loadComparisonMetrics(metrics.start_date, metrics.end_date, comparisonMode);
  }, [comparisonMode]);

  const loadComparisonMetrics = async (baseStartDate: string, baseEndDate: string, mode: ComparisonMode) => {
    try {
      const comparisonRange = getComparisonRange(baseStartDate, baseEndDate, mode);
      if (isAdmin) {
        const previousData = await soatAPI.getMetrics({
          start_date: comparisonRange.start_date,
          end_date: comparisonRange.end_date,
        });
        setPreviousMetrics(normalizeAdminMetrics(previousData));
      } else {
        const previousData = await soatAPI.getClientMetrics({
          start_date: comparisonRange.start_date,
          end_date: comparisonRange.end_date,
        });
        setPreviousMetrics(normalizeClientMetrics(previousData));
      }
    } catch (error) {
      console.error('Error al cargar comparación de métricas:', error);
      setPreviousMetrics(null);
    }
  };

  const loadMetrics = async (params?: { preset?: MetricsPreset; start_date?: string; end_date?: string }) => {
    setMetricsLoading(true);
    setMetricsError('');
    try {
      const data = isAdmin
        ? normalizeAdminMetrics(await soatAPI.getMetrics(params))
        : normalizeClientMetrics(await soatAPI.getClientMetrics(params));
      setMetrics(data);
      await loadComparisonMetrics(data.start_date, data.end_date, comparisonMode);
      setStartDate(data.start_date);
      setEndDate(data.end_date);
      setSummaryPage(1);
    } catch (error: any) {
      console.error('Error al cargar métricas:', error);
      setMetricsError(error.response?.data?.detail || 'No se pudieron cargar las métricas');
    } finally {
      setMetricsLoading(false);
    }
  };

  const loadData = async () => {
    try {
      const bolsaData = await soatAPI.getSaldo();
      setBolsa(bolsaData);

      if (isAdmin) {
        const [statsData, metricsData] = await Promise.all([
          soatAPI.getStats(),
          soatAPI.getMetrics({ preset: 'month' }),
        ]);
        setStats(statsData);
        const normalizedMetrics = normalizeAdminMetrics(metricsData);
        setMetrics(normalizedMetrics);
        await loadComparisonMetrics(normalizedMetrics.start_date, normalizedMetrics.end_date, comparisonMode);
        setStartDate(normalizedMetrics.start_date);
        setEndDate(normalizedMetrics.end_date);
        setSummaryPage(1);
      } else {
        const metricsData = await soatAPI.getClientMetrics({ preset: 'month' });
        const normalizedMetrics = normalizeClientMetrics(metricsData);
        setMetrics(normalizedMetrics);
        await loadComparisonMetrics(normalizedMetrics.start_date, normalizedMetrics.end_date, comparisonMode);
        setStartDate(normalizedMetrics.start_date);
        setEndDate(normalizedMetrics.end_date);
        setSummaryPage(1);
      }
    } catch (error) {
      console.error('Error al cargar datos:', error);
    } finally {
      setLoading(false);
    }
  };

  const handlePresetChange = async (value: MetricsPreset) => {
    setSelectedPreset(value);
    setMetricsError('');
    if (value !== 'custom') {
      await loadMetrics({ preset: value });
    }
  };

  const handleApplyCustomRange = async () => {
    if (!startDate || !endDate) {
      setMetricsError('Debes seleccionar fecha inicial y fecha final');
      return;
    }
    await loadMetrics({ start_date: startDate, end_date: endDate });
  };

  if (loading) {
    return <div className="text-center py-10">Cargando...</div>;
  }

  const saldoActual = bolsa?.saldo_actual ?? 0;
  const saldoNegativo = saldoActual < 0;

  return (
    <div className="px-4 py-6">
      <h1 className="text-4xl font-bold text-gray-900 text-center tracking-tight">Dashboard</h1>
      <p className="text-center text-gray-500 mt-2 mb-8">Resumen financiero y operativo en tiempo real</p>

      <div
        className={`overflow-hidden shadow-xl rounded-2xl mb-8 transform hover:scale-[1.02] transition-all duration-300 ${
          saldoNegativo
            ? 'bg-gradient-to-br from-red-600 to-red-700'
            : 'bg-gradient-to-br from-blue-500 to-blue-600'
        }`}
      >
        <div className="p-8">
          <div className="flex items-center">
            <div className="flex-1">
              <h3
                className={`text-lg font-semibold uppercase tracking-wide ${
                  saldoNegativo ? 'text-red-100' : 'text-blue-100'
                }`}
              >
                Saldo en Bolsa
              </h3>
              <p className="text-5xl font-bold text-white mt-3">{formatCurrency(saldoActual)}</p>
            </div>
            <div className="bg-white bg-opacity-20 rounded-full p-4">
              <svg className="w-16 h-16 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
            </div>
          </div>
        </div>
      </div>

      {saldoNegativo && (
        <div className="bg-gradient-to-r from-red-50 to-pink-50 border-l-4 border-red-500 p-5 mb-8 rounded-r-xl shadow-md">
          <p className="text-sm font-semibold text-red-800">
            <strong>Saldo en negativo:</strong> la bolsa está en {formatCurrency(saldoActual)}. Se permite seguir registrando consumos, pero se recomienda recargar lo antes posible.
          </p>
        </div>
      )}

      {isAdmin && stats && (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            <div className="relative overflow-hidden bg-white/95 backdrop-blur border border-gray-200 rounded-2xl shadow-sm hover:shadow-xl hover:-translate-y-0.5 transition-all duration-300">
              <div className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Total SOATs</h3>
                    <p className="text-3xl font-bold text-gray-900 mt-2">{stats.total_soats_expedidos}</p>
                  </div>
                  <div className="bg-blue-100 rounded-full p-3">
                    <svg className="w-8 h-8 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                  </div>
                </div>
              </div>
            </div>

            <div className="relative overflow-hidden bg-white/95 backdrop-blur border border-gray-200 rounded-2xl shadow-sm hover:shadow-xl hover:-translate-y-0.5 transition-all duration-300">
              <div className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Comisiones</h3>
                    <p className="text-3xl font-bold text-green-600 mt-2">{formatCurrency(stats.total_comisiones_generadas)}</p>
                  </div>
                  <div className="bg-green-100 rounded-full p-3">
                    <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                    </svg>
                  </div>
                </div>
              </div>
            </div>

            <div className="relative overflow-hidden bg-white/95 backdrop-blur border border-gray-200 rounded-2xl shadow-sm hover:shadow-xl hover:-translate-y-0.5 transition-all duration-300">
              <div className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Recargas</h3>
                    <p className="text-3xl font-bold text-purple-600 mt-2">{formatCurrency(stats.total_recargas)}</p>
                  </div>
                  <div className="bg-purple-100 rounded-full p-3">
                    <svg className="w-8 h-8 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
                    </svg>
                  </div>
                </div>
              </div>
            </div>

            <div className="relative overflow-hidden bg-white/95 backdrop-blur border border-gray-200 rounded-2xl shadow-sm hover:shadow-xl hover:-translate-y-0.5 transition-all duration-300">
              <div className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider">SOATs Hoy</h3>
                    <p className="text-3xl font-bold text-blue-600 mt-2">{stats.soats_hoy}</p>
                  </div>
                  <div className="bg-blue-100 rounded-full p-3">
                    <svg className="w-8 h-8 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </>
      )}

      {metrics && (
        <>
          <div className="bg-gradient-to-r from-slate-50 to-blue-50/60 shadow-sm rounded-2xl border border-blue-100 p-6 mb-6">
            <div className="flex flex-col lg:flex-row gap-4 lg:items-end lg:justify-between">
              <div>
                <h3 className="text-lg font-bold text-gray-900">Métricas por rango</h3>
                <p className="text-sm text-gray-500 mt-1">Filtra por período para analizar operación comercial y financiera.</p>
              </div>
              <div className="flex flex-col sm:flex-row gap-3">
                <select
                  value={comparisonMode}
                  onChange={(e) => setComparisonMode(e.target.value as ComparisonMode)}
                  className="px-4 py-2 border border-gray-300 bg-white rounded-lg text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
                >
                  <option value="previousPeriod">Comparar vs período anterior</option>
                  <option value="samePeriodLastYear">Comparar vs mismo período año anterior</option>
                </select>
                <select
                  value={selectedPreset}
                  onChange={(e) => void handlePresetChange(e.target.value as MetricsPreset)}
                  className="px-4 py-2 border border-gray-300 bg-white rounded-lg text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
                >
                  {PRESETS.map((preset) => (
                    <option key={preset.value} value={preset.value}>
                      {preset.label}
                    </option>
                  ))}
                </select>
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  disabled={selectedPreset !== 'custom'}
                  className="px-3 py-2 border border-gray-300 bg-white rounded-lg text-sm shadow-sm disabled:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-400"
                />
                <input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  disabled={selectedPreset !== 'custom'}
                  className="px-3 py-2 border border-gray-300 bg-white rounded-lg text-sm shadow-sm disabled:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-400"
                />
                <button
                  type="button"
                  onClick={() => void handleApplyCustomRange()}
                  disabled={selectedPreset !== 'custom' || metricsLoading}
                  className="px-4 py-2 bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-lg text-sm font-semibold shadow hover:shadow-md disabled:opacity-50"
                >
                  Aplicar
                </button>
              </div>
            </div>
            {metricsError && (
              <div className="mt-4 bg-red-50 border border-red-200 text-red-700 text-sm px-4 py-3 rounded-lg">
                {metricsError}
              </div>
            )}
          </div>

          {metricsLoading && (
            <div className="bg-white shadow rounded-2xl border border-gray-200 p-6 mb-6 text-center text-gray-500">
              Cargando métricas...
            </div>
          )}

          {!metricsLoading && metrics && (
            <>
              {(() => {
                const dailyRowsDesc = [...metrics.serie_diaria].sort((a, b) => b.fecha.localeCompare(a.fecha));
                const totalSummaryPages = Math.max(
                  1,
                  Math.ceil(dailyRowsDesc.length / summaryItemsPerPage)
                );
                const safePage = Math.min(summaryPage, totalSummaryPages);
                const startIndex = (safePage - 1) * summaryItemsPerPage;
                const endIndex = startIndex + summaryItemsPerPage;
                const paginatedDailyRows = dailyRowsDesc.slice(startIndex, endIndex);
                const hasComparisonData = Boolean(previousMetrics);
                const soatsDelta = hasComparisonData
                  ? getDeltaPercent(
                      metrics.resumen.soats_expedidos,
                      previousMetrics!.resumen.soats_expedidos
                    )
                  : null;
                const comisionesDelta = isAdmin && hasComparisonData
                  ? getDeltaPercent(
                      metrics.resumen.comisiones_generadas ?? 0,
                      previousMetrics!.resumen.comisiones_generadas ?? 0
                    )
                  : null;
                const recargasDelta = !isAdmin && hasComparisonData
                  ? getDeltaPercent(
                      metrics.resumen.recargas_total,
                      previousMetrics!.resumen.recargas_total
                    )
                  : null;
                const consumoDelta = hasComparisonData
                  ? getDeltaPercent(
                      metrics.resumen.consumo_total,
                      previousMetrics!.resumen.consumo_total
                    )
                  : null;
                const soatsDeltaStyle = getDeltaStyle(soatsDelta ?? 0);
                const comisionesDeltaStyle = getDeltaStyle(comisionesDelta ?? 0);
                const recargasDeltaStyle = getDeltaStyle(recargasDelta ?? 0);
                const consumoDeltaStyle = getDeltaStyle(consumoDelta ?? 0);
                const comparisonLabel =
                  comparisonMode === 'samePeriodLastYear'
                    ? 'Comparado con mismo período del año anterior'
                    : 'Comparado con período anterior equivalente';
                const barChartData = metrics.por_tipo.map((item) => ({
                  ...item,
                  tipo_label: tipoMotoLabel[item.tipo_moto] || item.tipo_moto,
                }));

                return (
                  <>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                <div className="bg-white border border-gray-200 rounded-2xl p-4 shadow-sm">
                  <p className="text-xs uppercase text-gray-500 font-semibold">Insight SOATs</p>
                  <p className="text-sm text-gray-600 mt-1">{comparisonLabel}</p>
                  <div className="mt-3 flex items-center justify-between">
                    <p className="text-xl font-bold text-gray-900">{metrics.resumen.soats_expedidos}</p>
                    <span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${soatsDeltaStyle.bg} ${soatsDeltaStyle.text}`}>
                      {soatsDelta !== null ? `${soatsDeltaStyle.icon} ${Math.abs(soatsDelta).toFixed(1)}%` : 'Sin datos comparativos'}
                    </span>
                  </div>
                </div>
                <div className="bg-white border border-gray-200 rounded-2xl p-4 shadow-sm">
                  <p className="text-xs uppercase text-gray-500 font-semibold">{isAdmin ? 'Insight Comisiones' : 'Insight Recargas'}</p>
                  <p className="text-sm text-gray-600 mt-1">{comparisonLabel}</p>
                  <div className="mt-3 flex items-center justify-between">
                    <p className="text-xl font-bold text-gray-900">
                      {formatCurrency(isAdmin ? (metrics.resumen.comisiones_generadas ?? 0) : metrics.resumen.recargas_total)}
                    </p>
                    <span
                      className={`px-2.5 py-1 rounded-full text-xs font-semibold ${
                        isAdmin
                          ? `${comisionesDeltaStyle.bg} ${comisionesDeltaStyle.text}`
                          : `${recargasDeltaStyle.bg} ${recargasDeltaStyle.text}`
                      }`}
                    >
                      {isAdmin
                        ? (comisionesDelta !== null ? `${comisionesDeltaStyle.icon} ${Math.abs(comisionesDelta).toFixed(1)}%` : 'Sin datos comparativos')
                        : (recargasDelta !== null ? `${recargasDeltaStyle.icon} ${Math.abs(recargasDelta).toFixed(1)}%` : 'Sin datos comparativos')}
                    </span>
                  </div>
                </div>
                <div className="bg-white border border-gray-200 rounded-2xl p-4 shadow-sm">
                  <p className="text-xs uppercase text-gray-500 font-semibold">Insight Consumo</p>
                  <p className="text-sm text-gray-600 mt-1">{comparisonLabel}</p>
                  <div className="mt-3 flex items-center justify-between">
                    <p className="text-xl font-bold text-gray-900">{formatCurrency(metrics.resumen.consumo_total)}</p>
                    <span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${consumoDeltaStyle.bg} ${consumoDeltaStyle.text}`}>
                      {consumoDelta !== null ? `${consumoDeltaStyle.icon} ${Math.abs(consumoDelta).toFixed(1)}%` : 'Sin datos comparativos'}
                    </span>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
                <div className="bg-white border border-gray-200 rounded-2xl p-4 shadow-sm hover:shadow-md transition-shadow">
                  <p className="text-xs uppercase text-gray-500 font-semibold">SOATs en rango</p>
                  <p className="text-2xl font-bold text-gray-900 mt-2">{metrics.resumen.soats_expedidos}</p>
                </div>
                {isAdmin && (
                  <div className="bg-white border border-gray-200 rounded-2xl p-4 shadow-sm hover:shadow-md transition-shadow">
                    <p className="text-xs uppercase text-gray-500 font-semibold">Comisiones en rango</p>
                    <p className="text-2xl font-bold text-green-600 mt-2">{formatCurrency(metrics.resumen.comisiones_generadas ?? 0)}</p>
                  </div>
                )}
                <div className="bg-white border border-gray-200 rounded-2xl p-4 shadow-sm hover:shadow-md transition-shadow">
                  <p className="text-xs uppercase text-gray-500 font-semibold">Recargas en rango</p>
                  <p className="text-2xl font-bold text-purple-600 mt-2">{formatCurrency(metrics.resumen.recargas_total)}</p>
                </div>
                <div className="bg-white border border-gray-200 rounded-2xl p-4 shadow-sm hover:shadow-md transition-shadow">
                  <p className="text-xs uppercase text-gray-500 font-semibold">Consumo SOAT</p>
                  <p className="text-2xl font-bold text-red-600 mt-2">{formatCurrency(metrics.resumen.consumo_total)}</p>
                </div>
                {isAdmin && (
                  <div className="bg-white border border-gray-200 rounded-2xl p-4 shadow-sm hover:shadow-md transition-shadow">
                    <p className="text-xs uppercase text-gray-500 font-semibold">Valor base SOAT</p>
                    <p className="text-2xl font-bold text-blue-600 mt-2">{formatCurrency(metrics.resumen.valor_soat_total ?? 0)}</p>
                  </div>
                )}
                <div className="bg-white border border-gray-200 rounded-2xl p-4 shadow-sm hover:shadow-md transition-shadow">
                  <p className="text-xs uppercase text-gray-500 font-semibold">Ticket promedio</p>
                  <p className="text-2xl font-bold text-gray-900 mt-2">{formatCurrency(Math.round(metrics.resumen.ticket_promedio))}</p>
                </div>
              </div>

              <div className="grid grid-cols-1 xl:grid-cols-2 gap-6 mb-6">
                <div className="bg-white border border-gray-200 rounded-2xl p-5 shadow-sm hover:shadow-md transition-shadow">
                  <h4 className="text-sm font-semibold text-gray-700 mb-3 uppercase tracking-wide">Tendencia diaria</h4>
                  <div className="h-72">
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={metrics.serie_diaria}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="fecha" tickFormatter={formatChartDate} />
                        <YAxis />
                        <Tooltip
                          labelFormatter={(label) => formatChartDate(String(label))}
                          formatter={(value, name) => {
                            if (name === 'recargas' || name === 'comisiones' || name === 'consumo') return [formatCurrency(Number(value)), name];
                            return [value, name];
                          }}
                        />
                        <Legend />
                        <Area type="monotone" dataKey="soats_expedidos" stroke="#2563eb" fill="#93c5fd" name="SOATs" />
                        {isAdmin && (
                          <Area type="monotone" dataKey="comisiones" stroke="#16a34a" fill="#86efac" name="Comisiones" />
                        )}
                        <Area type="monotone" dataKey="consumo" stroke="#ef4444" fill="#fecaca" name="Consumo" />
                        <Area type="monotone" dataKey="recargas" stroke="#7c3aed" fill="#c4b5fd" name="Recargas" />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                <div className="bg-white border border-gray-200 rounded-2xl p-5 shadow-sm hover:shadow-md transition-shadow">
                  <h4 className="text-sm font-semibold text-gray-700 mb-3 uppercase tracking-wide">Distribución por tipo de SOAT</h4>
                  <div className="h-72">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={metrics.por_tipo.map((item) => ({
                            ...item,
                            tipo_label: tipoMotoLabel[item.tipo_moto] || item.tipo_moto,
                          }))}
                          dataKey="cantidad"
                          nameKey="tipo_label"
                          outerRadius={110}
                          label
                        >
                          {metrics.por_tipo.map((entry, index) => (
                            <Cell key={entry.tipo_moto} fill={PIE_COLORS[index % PIE_COLORS.length]} />
                          ))}
                        </Pie>
                        <Tooltip />
                        <Legend />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              </div>

              <div className="bg-white border border-gray-200 rounded-2xl p-5 mb-6 shadow-sm hover:shadow-md transition-shadow">
                <h4 className="text-sm font-semibold text-gray-700 mb-3 uppercase tracking-wide">
                  {isAdmin ? 'Valor por tipo de SOAT' : 'Total por tipo de SOAT'}
                </h4>
                <div className="h-80">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      data={barChartData}
                    >
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="tipo_label" />
                      <YAxis />
                      <Tooltip formatter={(value) => formatCurrency(Number(value))} />
                      <Legend />
                      {isAdmin && <Bar dataKey="valor_soat" fill="#3b82f6" name="Valor SOAT" />}
                      {isAdmin && <Bar dataKey="comision" fill="#22c55e" name="Comisión" />}
                      <Bar dataKey="total" fill={isAdmin ? '#ef4444' : '#2563eb'} name="Total">
                        {!isAdmin &&
                          barChartData.map((entry, index) => (
                            <Cell
                              key={`total-color-${entry.tipo_moto}`}
                              fill={CLIENT_TOTAL_BAR_COLOR_BY_TYPE[entry.tipo_moto] || (index === 0 ? '#2563eb' : '#ef4444')}
                            />
                          ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>

              <div className="bg-white border border-gray-200 rounded-2xl overflow-hidden shadow-sm">
                <div className="px-4 py-3 border-b border-gray-200">
                  <h4 className="text-sm font-semibold text-gray-700 uppercase tracking-wide">Resumen diario</h4>
                </div>
                <div className="overflow-x-auto">
                  <table className="min-w-full text-sm">
                    <thead className="bg-slate-50">
                      <tr>
                        <th className="px-4 py-3 text-left font-semibold text-gray-600">Fecha</th>
                        <th className="px-4 py-3 text-left font-semibold text-gray-600">SOATs</th>
                        {isAdmin && <th className="px-4 py-3 text-left font-semibold text-gray-600">Comisiones</th>}
                        <th className="px-4 py-3 text-left font-semibold text-gray-600">Consumo</th>
                        <th className="px-4 py-3 text-left font-semibold text-gray-600">Recargas</th>
                      </tr>
                    </thead>
                    <tbody>
                      {paginatedDailyRows.map((item) => (
                        <tr key={item.fecha} className="border-t border-gray-100 odd:bg-white even:bg-slate-50/40">
                          <td className="px-4 py-3 text-gray-700">{formatChartDate(item.fecha)}</td>
                          <td className="px-4 py-3 text-gray-900 font-medium">{item.soats_expedidos}</td>
                          {isAdmin && <td className="px-4 py-3 text-green-700">{formatCurrency(item.comisiones ?? 0)}</td>}
                          <td className="px-4 py-3 text-red-700">{formatCurrency(item.consumo)}</td>
                          <td className="px-4 py-3 text-purple-700">{formatCurrency(item.recargas)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                {dailyRowsDesc.length > summaryItemsPerPage && (
                  <div className="px-4 py-3 border-t border-gray-200 bg-gray-50 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                    <p className="text-sm text-gray-600">
                      Mostrando{' '}
                      <span className="font-semibold">{startIndex + 1}</span> a{' '}
                      <span className="font-semibold">
                        {Math.min(endIndex, dailyRowsDesc.length)}
                      </span>{' '}
                      de <span className="font-semibold">{dailyRowsDesc.length}</span> días
                    </p>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => setSummaryPage((prev) => Math.max(prev - 1, 1))}
                        disabled={safePage === 1}
                        className="px-3 py-1.5 text-sm rounded-lg border border-gray-300 bg-white text-gray-700 hover:bg-gray-100 disabled:opacity-50"
                      >
                        Anterior
                      </button>
                      <span className="text-sm text-gray-600">
                        Página <span className="font-semibold">{safePage}</span> de{' '}
                        <span className="font-semibold">{totalSummaryPages}</span>
                      </span>
                      <button
                        type="button"
                        onClick={() => setSummaryPage((prev) => Math.min(prev + 1, totalSummaryPages))}
                        disabled={safePage === totalSummaryPages}
                        className="px-3 py-1.5 text-sm rounded-lg border border-gray-300 bg-white text-gray-700 hover:bg-gray-100 disabled:opacity-50"
                      >
                        Siguiente
                      </button>
                    </div>
                  </div>
                )}
              </div>
                  </>
                );
              })()}
            </>
          )}
        </>
      )}
    </div>
  );
};

export default Dashboard;
