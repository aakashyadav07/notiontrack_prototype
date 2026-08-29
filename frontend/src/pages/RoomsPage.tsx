import React from 'react';
import { Search, Plus, Edit, Trash2, Download, Maximize2, Minimize2 } from 'lucide-react';
import { roomApi, departmentApi } from '../api';
import LoadingSpinner from '../components/LoadingSpinner';

export default function RoomsPage() {
  return (
    <div className="space-y-6 animate-fade-in">
      <div className="page-header">
        <div>
          <h1 className="page-title">Rooms</h1>
          <p className="text-gray-600 mt-1">Manage examination rooms and seating layouts</p>
        </div>
        <button className="btn-primary">
          <Plus className="w-4 h-4 mr-2" />
          Add Room
        </button>
      </div>

      {/* Filters */}
      <div className="card">
        <div className="card-body">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="relative flex-1">
              <input
                type="text"
                placeholder="Search by room code, name, or building..."
                className="input pl-10"
              />
            </div>
            <select className="input w-auto">
              <option value="">All Buildings</option>
              <option value="A">Building A</option>
              <option value="B">Building B</option>
              <option value="C">Building C</option>
            </select>
            <select className="input w-auto">
              <option value="">All Status</option>
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
            </select>
            <button className="btn-secondary">
              <Download className="w-4 h-4 mr-2" />
              Export
            </button>
          </div>
        </div>
      </div>

      {/* Rooms Table */}
      <div className="card">
        <div className="card-body p-0">
          <div className="overflow-x-auto">
            <table className="table w-full">
              <thead>
                <tr>
                  <th>Code</th>
                  <th>Name</th>
                  <th>Capacity</th>
                  <th>Building</th>
                  <th>Floor</th>
                  <th>Facilities</th>
                  <th>Status</th>
                  <th className="w-24">Actions</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td className="font-medium">R101</td>
                  <td>Lecture Hall 101</td>
                  <td>30</td>
                  <td>A</td>
                  <td>1</td>
                  <td>
                    <div className="flex items-center space-x-2">
                      <span className="badge badge-success">Projector</span>
                      <span className="badge badge-success">AC</span>
                      <span className="badge badge-success">Accessible</span>
                    </div>
                  </td>
                  <td><span className="badge badge-success">Active</span></td>
                  <td>
                    <div className="flex items-center space-x-2">
                      <button className="p-2 rounded-lg hover:bg-gray-100 text-gray-600" title="View Layout">
                        <Maximize2 className="w-4 h-4" />
                      </button>
                      <button className="p-2 rounded-lg hover:bg-gray-100 text-gray-600" title="Edit">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
                      </button>
                      <button className="p-2 rounded-lg hover:bg-gray-100 text-red-600" title="Delete">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                      </button>
                    </div>
                  </td>
                </tr>
                <tr>
                  <td className="font-medium">R201</td>
                  <td>Lecture Hall 201</td>
                  <td>50</td>
                  <td>A</td>
                  <td>2</td>
                  <td>
                    <div className="flex items-center space-x-2">
                      <span className="badge badge-success">Projector</span>
                      <span className="badge badge-success">AC</span>
                      <span className="badge badge-success">Accessible</span>
                    </div>
                  </td>
                  <td><span className="badge badge-success">Active</span></td>
                  <td>
                    <div className="flex items-center space-x-2">
                      <button className="p-2 rounded-lg hover:bg-gray-100 text-gray-600" title="View Layout"><Maximize2 className="w-4 h-4" /></button>
                      <button className="p-2 rounded-lg hover:bg-gray-100 text-gray-600" title="Edit"><svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg></button>
                      <button className="p-2 rounded-lg hover:bg-gray-100 text-red-600" title="Delete"><svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg></button>
                    </div>
                  </td>
                </tr>
                <tr>
                  <td className="font-medium">R501</td>
                  <td>Main Auditorium</td>
                  <td>200</td>
                  <td>C</td>
                  <td>1</td>
                  <td>
                    <div className="flex items-center space-x-2">
                      <span className="badge badge-success">Projector</span>
                      <span className="badge badge-success">AC</span>
                      <span className="badge badge-success">Accessible</span>
                    </div>
                  </td>
                  <td><span className="badge badge-success">Active</span></td>
                  <td>
                    <div className="flex items-center space-x-2">
                      <button className="p-2 rounded-lg hover:bg-gray-100 text-gray-600" title="View Layout"><Maximize2 className="w-4 h-4" /></button>
                      <button className="p-2 rounded-lg hover:bg-gray-100 text-gray-600" title="Edit"><svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg></button>
                      <button className="p-2 rounded-lg hover:bg-gray-100 text-red-600" title="Delete"><svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg></button>
                    </div>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Seat Layout Modal Placeholder */}
      <div className="card mt-6">
        <div className="card-header">
          <h2 className="text-lg font-semibold text-gray-900">Seat Layout Editor (R101)</h2>
        </div>
        <div className="card-body">
          <div className="grid grid-cols-5 gap-1 max-w-md mx-auto">
            {[...Array(15)].map((_, i) => (
              <div key={i} className="aspect-square border-2 border-gray-300 rounded flex items-center justify-center text-xs font-medium text-gray-500 hover:border-primary-500 hover:bg-primary-50 transition-colors cursor-pointer">
                {String.fromCharCode(65 + Math.floor(i / 3))}{i % 3 + 1}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}