import React from 'react';
import { Search, Plus, Edit, Trash2, Download, AlertCircle, CheckCircle, Clock, User, FileText } from 'lucide-react';
import { examApi, subjectApi } from '../api';
import LoadingSpinner from '../components/LoadingSpinner';

const EXAM_TYPE_COLORS: Record<string, string> = {
  REGULAR: 'badge-info',
  SUPPLEMENTARY: 'badge-warning',
  PRACTICAL: 'badge-success',
};

const EXAM_STATUS_COLORS: Record<string, string> = {
  DRAFT: 'badge-gray',
  SCHEDULED: 'badge-info',
  PUBLISHED: 'badge-success',
  COMPLETED: 'badge-gray',
  CANCELLED: 'badge-danger',
};

export default function ExamsPage() {
  return (
    <div className="space-y-6 animate-fade-in">
      <div className="page-header">
        <div>
          <h1 className="page-title">Exams</h1>
          <p className="text-gray-600 mt-1">Manage examinations and registrations</p>
        </div>
        <button className="btn-primary">
          <Plus className="w-4 h-4 mr-2" />
          Add Exam
        </button>
      </div>

      {/* Filters */}
      <div className="card">
        <div className="card-body">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="relative flex-1">
              <input
                type="text"
                placeholder="Search by subject, type..."
                className="input pl-10"
              />
            </div>
            <select className="input w-auto">
              <option value="">All Types</option>
              <option value="REGULAR">Regular</option>
              <option value="SUPPLEMENTARY">Supplementary</option>
              <option value="PRACTICAL">Practical</option>
            </select>
            <select className="input w-auto">
              <option value="">All Status</option>
              <option value="DRAFT">Draft</option>
              <option value="SCHEDULED">Scheduled</option>
              <option value="PUBLISHED">Published</option>
              <option value="COMPLETED">Completed</option>
              <option value="CANCELLED">Cancelled</option>
            </select>
            <button className="btn-secondary">
              <Download className="w-4 h-4 mr-2" />
              Export
            </button>
          </div>
        </div>
      </div>

      {/* Exams Table */}
      <div className="card">
        <div className="card-body p-0">
          <div className="overflow-x-auto">
            <table className="table w-full">
              <thead>
                <tr>
                  <th>Subject</th>
                  <th>Type</th>
                  <th>Duration</th>
                  <th>Max Students</th>
                  <th>Registrations</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td>
                    <div>
                      <p className="font-medium">Programming Fundamentals</p>
                      <p className="text-sm text-gray-500">CS101</p>
                    </div>
                  </td>
                  <td><span className="badge badge-info">Regular</span></td>
                  <td>180 min</td>
                  <td>120</td>
                  <td>95</td>
                  <td><span className="badge badge-info">Scheduled</span></td>
                  <td>
                    <div className="flex items-center space-x-2">
                      <button className="p-2 rounded-lg hover:bg-gray-100 text-gray-600" title="Edit">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
                      </button>
                      <button className="p-2 rounded-lg hover:bg-gray-100 text-blue-600" title="Registrations">
                        <User className="w-4 h-4" />
                      </button>
                      <button className="p-2 rounded-lg hover:bg-gray-100 text-red-600" title="Delete">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                      </button>
                    </div>
                  </td>
                </tr>
                <tr>
                  <td>
                    <div>
                      <p className="font-medium">Data Structures</p>
                      <p className="text-sm text-gray-500">CS102</p>
                    </div>
                  </td>
                  <td><span className="badge badge-info">Regular</span></td>
                  <td>180 min</td>
                  <td>100</td>
                  <td>87</td>
                  <td><span className="badge badge-success">Published</span></td>
                  <td>
                    <div className="flex items-center space-x-2">
                      <button className="p-2 rounded-lg hover:bg-gray-100 text-gray-600" title="Edit"><svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg></button>
                      <button className="p-2 rounded-lg hover:bg-gray-100 text-blue-600" title="Registrations"><User className="w-4 h-4" /></button>
                      <button className="p-2 rounded-lg hover:bg-gray-100 text-red-600" title="Delete"><svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg></button>
                    </div>
                  </td>
                </tr>
                <tr>
                  <td>
                    <div>
                      <p className="font-medium">Database Systems</p>
                      <p className="text-sm text-gray-500">CS202</p>
                    </div>
                  </td>
                  <td><span className="badge badge-success">Practical</span></td>
                  <td>150 min</td>
                  <td>50</td>
                  <td>42</td>
                  <td><span className="badge badge-warning">Draft</span></td>
                  <td>
                    <div className="flex items-center space-x-2">
                      <button className="p-2 rounded-lg hover:bg-gray-100 text-gray-600" title="Edit"><svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg></button>
                      <button className="p-2 rounded-lg hover:bg-gray-100 text-blue-600" title="Registrations"><User className="w-4 h-4" /></button>
                      <button className="p-2 rounded-lg hover:bg-gray-100 text-red-600" title="Delete"><svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg></button>
                    </div>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Registrations Modal Placeholder */}
      <div className="card mt-6">
        <div className="card-header flex items-center justify-between">
          <h2 className="text-lg font-semibold text-gray-900">Exam Registrations (CS101 - Programming Fundamentals)</h2>
          <button className="btn-primary btn-sm">
            <Plus className="w-4 h-4 mr-2" />
            Register Students
          </button>
        </div>
        <div className="card-body p-0">
          <div className="overflow-x-auto">
            <table className="table w-full">
              <thead>
                <tr>
                  <th>Student ID</th>
                  <th>Name</th>
                  <th>Department</th>
                  <th>Semester</th>
                  <th>Section</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td className="font-medium">CS2023001</td>
                  <td>John Doe</td>
                  <td>CSE</td>
                  <td>3</td>
                  <td>A</td>
                  <td><span className="badge badge-success">Registered</span></td>
                  <td>
                    <button className="p-2 rounded-lg hover:bg-gray-100 text-red-600" title="Unregister">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                    </button>
                  </td>
                </tr>
                <tr>
                  <td className="font-medium">CS2023002</td>
                  <td>Jane Smith</td>
                  <td>CSE</td>
                  <td>3</td>
                  <td>A</td>
                  <td><span className="badge badge-success">Registered</span></td>
                  <td>
                    <button className="p-2 rounded-lg hover:bg-gray-100 text-red-600" title="Unregister">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                    </button>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}

