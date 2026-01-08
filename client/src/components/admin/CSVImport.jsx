import React, { useState } from 'react';
import './CSVImport.css';
import api from '../../services/api';

const CSVImport = () => {
    const [file, setFile] = useState(null);
    const [importing, setImporting] = useState(false);
    const [result, setResult] = useState(null);
    const [error, setError] = useState(null);
    const [preview, setPreview] = useState([]);

    const handleFileChange = (e) => {
        const selectedFile = e.target.files[0];
        if (selectedFile) {
            if (selectedFile.type !== 'text/csv' && !selectedFile.name.endsWith('.csv')) {
                setError('Please select a CSV file');
                return;
            }
            setFile(selectedFile);
            setError(null);
            setResult(null);

            // Preview the CSV
            const reader = new FileReader();
            reader.onload = (event) => {
                const text = event.target.result;
                const rows = parseCSV(text);
                setPreview(rows.slice(0, 5)); // Show first 5 rows
            };
            reader.readAsText(selectedFile);
        }
    };

    const parseCSV = (text) => {
        const lines = text.split('\n').filter(line => line.trim());
        const headers = lines[0].split(',').map(h => h.trim().toLowerCase());

        const data = [];
        for (let i = 1; i < lines.length; i++) {
            const values = lines[i].split(',').map(v => v.trim());

            // Find name and phone columns (required)
            const nameIndex = headers.indexOf('name');
            const phoneIndex = headers.indexOf('phone');

            // Skip if required fields are missing or empty
            if (nameIndex === -1 || phoneIndex === -1) continue;
            if (!values[nameIndex] || !values[phoneIndex]) continue;

            const row = {};
            headers.forEach((header, index) => {
                row[header] = values[index] || '';
            });
            data.push(row);
        }
        return data;
    };

    const handleImport = async () => {
        if (!file) {
            setError('Please select a file');
            return;
        }

        setImporting(true);
        setError(null);
        setResult(null);

        try {
            const reader = new FileReader();
            reader.onload = async (event) => {
                const text = event.target.result;
                const contacts = parseCSV(text);

                if (contacts.length === 0) {
                    setError('No valid contacts found in CSV');
                    setImporting(false);
                    return;
                }

                // Import each contact as a lead
                let successCount = 0;
                let failCount = 0;

                for (const contact of contacts) {
                    try {
                        await api.createLead({
                            company: contact.name || 'Unknown',
                            name: contact.name || 'Unknown',
                            phone: contact.phone || '',
                            email: '',
                            location: contact.address || '',
                            status: contact.status || 'new',
                            priority: 'warm',
                            notes: contact.description || 'Imported from CSV'
                        });
                        successCount++;
                    } catch (err) {
                        console.error('Failed to import contact:', contact, err);
                        failCount++;
                    }
                }

                setResult({
                    total: contacts.length,
                    success: successCount,
                    failed: failCount
                });
                setImporting(false);
                setFile(null);
                setPreview([]);
            };
            reader.readAsText(file);
        } catch (err) {
            setError('Failed to import CSV: ' + err.message);
            setImporting(false);
        }
    };

    const handleReset = () => {
        setFile(null);
        setPreview([]);
        setResult(null);
        setError(null);
    };

    return (
        <div className="csv-import">
            <div className="csv-header">
                <h3>Import Contacts from CSV</h3>
                <p>Upload a CSV file with Name and Phone columns to add contacts to your call queue.</p>
            </div>

            <div className="csv-format-info">
                <strong>Required Format:</strong>
                <pre>Name,Phone,Address,Status,Description
Stephen,902-402-8391,123 Main St,new,Needs HVAC quote
William,250-574-1462,456 Oak Ave,contacted,Follow up next week</pre>
                <small>
                    <strong>Required columns:</strong> Name, Phone<br />
                    <strong>Optional columns:</strong> Address, Status, Description
                </small>
            </div>

            <div className="csv-upload-section">
                <input
                    type="file"
                    accept=".csv"
                    onChange={handleFileChange}
                    id="csv-file-input"
                    style={{ display: 'none' }}
                />
                <label htmlFor="csv-file-input" className="btn-upload">
                    {file ? '📄 ' + file.name : '📁 Choose CSV File'}
                </label>
                {file && (
                    <button className="btn-reset-file" onClick={handleReset}>
                        Clear
                    </button>
                )}
            </div>

            {preview.length > 0 && (
                <div className="csv-preview">
                    <h4>Preview (first 5 contacts):</h4>
                    <table>
                        <thead>
                            <tr>
                                <th>Name</th>
                                <th>Phone</th>
                                <th>Address</th>
                                <th>Status</th>
                                <th>Description</th>
                            </tr>
                        </thead>
                        <tbody>
                            {preview.map((row, index) => (
                                <tr key={index}>
                                    <td>{row.name}</td>
                                    <td>{row.phone}</td>
                                    <td>{row.address || '-'}</td>
                                    <td>{row.status || 'new'}</td>
                                    <td>{row.description || '-'}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                    <p className="preview-note">
                        {preview.length} contacts shown • Total contacts to import: {preview.length > 5 ? 'more than 5' : preview.length}
                    </p>
                </div>
            )}

            {error && (
                <div className="import-error">
                    ⚠️ {error}
                </div>
            )}

            {result && (
                <div className="import-result">
                    <h4>✓ Import Complete!</h4>
                    <div className="result-stats">
                        <div className="stat">
                            <span className="stat-label">Total:</span>
                            <span className="stat-value">{result.total}</span>
                        </div>
                        <div className="stat success">
                            <span className="stat-label">Success:</span>
                            <span className="stat-value">{result.success}</span>
                        </div>
                        {result.failed > 0 && (
                            <div className="stat failed">
                                <span className="stat-label">Failed:</span>
                                <span className="stat-value">{result.failed}</span>
                            </div>
                        )}
                    </div>
                </div>
            )}

            <div className="csv-actions">
                <button
                    className="btn-import"
                    onClick={handleImport}
                    disabled={!file || importing}
                >
                    {importing ? 'Importing...' : 'Import Contacts'}
                </button>
            </div>
        </div>
    );
};

export default CSVImport;
