import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Download, BarChart, PieChart, TrendingUp, Calendar, Building, Users, AlertTriangle, FileText, Clock, Filter, FileText as FileTextIcon } from 'lucide-react';
import { reportApi } from '../api';
import LoadingSpinner from '../components/LoadingSpinner';
import { format } from 'date-fns';

const reportTypes = [
  { id: 'dashboard', name: 'Dashboard Summary', icon: BarChart, description: 'Overview of key metrics and statistics' },
  { id: 'timetable', name: 'Timetable Report', icon: Calendar, description: 'Complete timetable with exam schedule' },
  { id: 'rooms', name: 'Room Utilization', icon: Building, description: 'Room capacity and usage statistics' },
  { id: 'seats', name: 'Seat Allocation', icon: Users, description: 'Student seating assignments by room' },
  { id: 'conflicts', name: 'Conflict Statistics', icon: AlertTriangle, description: 'Conflict detection and resolution summary' },
  { id: 'faculty', name: 'Faculty Workload', icon: Users, description: 'Invigilator assignments and workload distribution' },
  { id: 'exams', name: 'Exam Statistics', icon: FileText, description: 'Exam distribution and student counts' },
];

const sampleCharts = {
  roomUtilization: [
    { room: 'R101', utilization: 85 },
    { room: 'R201', utilization: 92 },
    { room: 'R301', utilization: 78 },
    { room: 'R501', utilization: 65 },
    { room: 'R502', utilization: 45 },
  ],
  conflictDistribution: [
    { type: 'Student Time', count: 5 },
    { type: 'Room Double Booking', count: 3 },
    { type: 'Faculty Double Booking', count: 2 },
    { type: 'Capacity Exceeded', count: 1 },
    { type: 'Missing Room', count: 1 },
  ],
};

function renderPieChartPaths() {
  const colors = ['#ef4444', '#f97316', '#eab308', '#22c55e', '#3b82f6'];
  let cumulative = 0;
  const total = sampleCharts.conflictDistribution.reduce((sum, d) => sum + d.count, 0);
  
  const paths = sampleCharts.conflictDistribution.map((item, index) => {
    const percentage = (item.count / total) * 100;
    const angle = (percentage / 100) * 360;
    const startAngle = cumulative;
    cumulative += angle;
    const startRad = (startAngle - 90) * Math.PI / 180;
    const endRad = (startAngle + angle - 90) * Math.PI / 180;
    const x1 = 100 + 80 * Math.cos(startRad);
    const y1 = 100 + 80 * Math.sin(startRad);
    const x2 = 100 + 80 * Math.cos(endRad);
    const y2 = 100 + 80 * Math.sin(endRad);
    const largeArc = angle > 180 ? 1 : 0;
    const color = colors[index % colors.length];
    
    return (
      <path
        key={index}
        d={`M 100 100 L ${x1} ${y1} A 80 80 0 ${largeArc} 1 ${x2} ${y2} Z`}
        fill={color}
      />
    );
  });
  
  return (
    <svg viewBox="0 0 200 200" className="w-full h-full">
      {paths}
    </svg>
  );
}

const colors = ['#ef4444', '#f97316', '#eab308', '#22c55e', '#3b82f6'];

function renderConflictLegend() {
  return sampleCharts.conflictDistribution.map((item, index) => (
    <div key={item.type} className="flex items-center justify-between text-sm">
      <div className="flex items-center space-x-2">
        <div className="w-3 h-3 rounded" style={{ backgroundColor: colors[index % 5] }} />
        <span className="text-gray-700">{item.type}</span>
      </div>
      <span className="font-medium">{item.count}</span>
    </div>
  ));
}

export default function ReportsPage() {
  const [selectedReport, setSelectedReport] = useState('dashboard');
  const [format, setFormat] = useState<'json' | 'pdf' | 'excel'>('pdf');
  const [dateRange, setDateRange] = useState({ start: '', end: '' });
  const [generating, setGenerating] = useState(false);

  const { data: dashboard } = useQuery({
    queryKey: ['dashboard'],
    queryFn: () => reportApi.getDashboard(),
  });

  const handleGenerate = () => {
    setGenerating(true);
    setTimeout(() => {
      setGenerating(false);
      alert(`Report generated successfully in ${format.toUpperCase()} format!`);
    }, 2000);
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="page-header">
        <div>
          <h1 className="page-title">Reports & Analytics</h1>
          <p className="text-gray-600 mt-1">Generate and export comprehensive reports</p>
        </div>
      </div>

      {/* Report Type Selector */}
      <div className="card">
        <div className="card-header">
          <h2 className="text-lg font-semibold text-gray-900">Select Report Type</h2>
        </div>
        <div className="card-body">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {reportTypes.map((report) => {
              return (
                <button
                  key={report.id}
                  onClick={() => setSelectedReport(report.id)}
                  className={`p-4 rounded-xl border-2 transition-all text-left ${
                    selectedReport === report.id
                      ? 'border-primary-500 bg-primary-50'
                      : 'border-gray-200 hover:border-primary-300 hover:bg-gray-50'
                  }`}
                >
                  <div className="flex items-center space-x-3">
                    <div className="w-12 h-12 rounded-xl bg-primary-100 flex items-center justify-center">
                      <report.icon className="w-6 h-6 text-primary-600" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-gray-900">{report.name}</h3>
                      <p className="text-sm text-gray-500">{report.description}</p>
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Report Configuration */}
      <div className="card">
        <div className="card-header">
          <h2 className="text-lg font-semibold text-gray-900">Report Configuration</h2>
        </div>
        <div className="card-body">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="label">Date Range</label>
              <div className="flex space-x-2">
                <input
                  type="date"
                  value={dateRange.start}
                  onChange={(e) => setDateRange({ ...dateRange, start: e.target.value })}
                  className="input"
                />
                <span className="flex items-center text-gray-400">to</span>
                <input
                  type="date"
                  value={dateRange.end}
                  onChange={(e) => setDateRange({ ...dateRange, end: e.target.value })}
                  className="input"
                />
              </div>
            </div>
            <div>
              <label className="label">Format</label>
              <select
                value={format}
                onChange={(e) => setFormat(e.target.value as any)}
                className="input"
              >
                <option value="pdf">PDF</option>
                <option value="excel">Excel</option>
                <option value="json">JSON</option>
              </select>
            </div>
            <div>
              <label className="label">Timetable (Optional)</label>
              <select className="input">
                <option value="">All Timetables</option>
                <option value="1">Fall 2024 Final Exams</option>
                <option value="2">Spring 2024 Midterms</option>
              </select>
            </div>
          </div>
        </div>
      </div>

      {/* Report Preview / Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Room Utilization Chart */}
        <div className="card">
          <div className="card-header flex items-center justify-between">
            <h2 className="text-lg font-semibold text-gray-900">Room Utilization</h2>
            <button className="btn-ghost btn-sm">View Details</button>
          </div>
          <div className="card-body h-64">
            <div className="h-full flex items-end justify-around px-4">
              {sampleCharts.roomUtilization.map((item, index) => {
                return (
                  <div key={item.room} className="flex flex-col items-center flex-1 h-full">
                    <div
                      className="w-full bg-primary-600 rounded-t transition-all duration-500"
                      style={{ height: `${item.utilization}%` }}
                    />
                    <span className="text-xs font-medium text-gray-600 mt-2">{item.utilization}%</span>
                    <span className="text-xs text-gray-400">{item.room}</span>
                  </div>
                );
              })}
            </div>
            <div className="mt-4 grid grid-cols-5 gap-2 text-center">
              {sampleCharts.roomUtilization.map((item) => {
                return (
                  <div key={item.room} className="p-2 bg-gray-50 rounded">
                    <p className="text-sm font-medium">{item.room}</p>
                    <p className="text-xs text-gray-500">{item.utilization}%</p>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Conflict Distribution */}
        <div className="card">
          <div className="card-header flex items-center justify-between">
            <h2 className="text-lg font-semibold text-gray-900">Conflict Distribution</h2>
          </div>
          <div className="card-body h-64">
            <div className="h-full flex items-center justify-center">
              <div className="w-48 h-48 relative">
                <svg viewBox="0 0 200 200" className="w-full h-full">
                  {renderPieChartPaths()}
                </svg>
              </div>
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="bg-white rounded-full w-32 h-32 flex items-center justify-center">
                  <span className="text-2xl font-bold text-gray-900">12</span>
                  <span className="text-xs text-gray-500 block">Total</span>
                </div>
              </div>
            </div>
            <div className="mt-4 space-y-2">
              {renderConflictLegend()}
            </div>
          </div>
        </div>
      </div>

      {/* Generate Button */}
      <div className="flex justify-end">
        <button
          className="btn-primary btn-lg"
          onClick={handleGenerate}
          disabled={generating}
        >
          {generating ? (
            <>
              <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
              </svg>
              Generating Report...
            </>
          ) : (
            <>
              <Download className="w-5 h-5 mr-2" />
              Generate Report
            </>
          )}
        </button>
      </div>

      {/* Recent Reports */}
      <div className="card">
        <div className="card-header">
          <h2 className="text-lg font-semibold text-gray-900">Recent Reports</h2>
        </div>
        <div className="card-body p-0">
          <div className="divide-y divide-gray-200">
            {[
              { name: 'Fall 2024 Timetable Report', type: 'PDF', date: 'Dec 1, 2024', size: '2.4 MB' },
              { name: 'Room Utilization Q4 2024', type: 'Excel', date: 'Nov 28, 2024', size: '1.2 MB' },
              { name: 'Seat Allocation - R101', type: 'PDF', date: 'Nov 25, 2024', size: '856 KB' },
              { name: 'Conflict Statistics Report', type: 'Excel', date: 'Nov 20, 2024', size: '1.1 MB' },
              { name: 'Faculty Workload Analysis', type: 'PDF', date: 'Nov 15, 2024', size: '1.8 MB' },
            ].map((report, index) => {
              return (
                <div key={index} className="flex items-center justify-between p-4 hover:bg-gray-50">
                  <div className="flex items-center space-x-4">
                    <div className="w-10 h-10 rounded-lg bg-primary-100 flex items-center justify-center">
                      {report.type === 'PDF' ? (
                        <FileText className="w-5 h-5 text-red-600" />
                      ) : (
                        <FileText className="w-5 h-5 text-green-600" />
                      )}
                    </div>
                    <div>
                      <p className="font-medium text-gray-900">{report.name}</p>
                      <p className="text-sm text-gray-500">{report.date} • {report.size}</p>
                    </div>
                  </div>
                  <button className="btn-ghost btn-sm text-gray-600 hover:text-gray-900">
                    <Download className="w-4 h-4" />
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}