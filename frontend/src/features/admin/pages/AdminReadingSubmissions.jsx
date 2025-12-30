import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { AdminNavbar } from "../../../shared/components";
import { apiPath } from "../../../shared/utils/api";

const AdminReadingSubmissions = () => {
  const [subs, setSubs] = useState([]);
  const [loading, setLoading] = useState(true);
<<<<<<< HEAD
  const API = process.env.REACT_APP_API_URL;
=======
>>>>>>> main
  const navigate = useNavigate();

  useEffect(() => {
    const fetchSubs = async () => {
      setLoading(true);
      try {
<<<<<<< HEAD
        const res = await fetch(`${API}/api/reading-submissions`);
        if (!res.ok) throw new Error('Fetch failed');
        const data = await res.json();
        setSubs(data || []);
      } catch (err) {
        console.error('Error fetching reading submissions:', err);
=======
        const res = await fetch(apiPath("reading-submissions"));
        if (!res.ok) throw new Error("Fetch failed");
        const data = await res.json();
        setSubs(data || []);
      } catch (err) {
        console.error("Error fetching reading submissions:", err);
>>>>>>> main
        setSubs([]);
      } finally {
        setLoading(false);
      }
    };
    fetchSubs();
<<<<<<< HEAD
  }, [API]);
=======
  }, []);
>>>>>>> main

  return (
    <>
      <AdminNavbar />
      <div style={{ padding: 24 }}>
        <h2>📥 Reading Submissions</h2>
        {loading && <p>⏳ Loading...</p>}
        {!loading && subs.length === 0 && <p>No submissions yet</p>}
        {!loading && subs.length > 0 && (
<<<<<<< HEAD
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ background: '#f3f4f6' }}>
=======
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr style={{ background: "#f3f4f6" }}>
>>>>>>> main
                <th style={cellStyle}>#</th>
                <th style={cellStyle}>Mã lớp</th>
                <th style={cellStyle}>Giáo viên</th>
                <th style={cellStyle}>Student</th>
                <th style={cellStyle}>Correct</th>
                <th style={cellStyle}>Total</th>
                <th style={cellStyle}>Band</th>
                <th style={cellStyle}>Submitted At</th>
                <th style={cellStyle}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {subs.map((s, idx) => (
<<<<<<< HEAD
                <tr key={s.id} style={{ borderBottom: '1px solid #eee' }}>
                  <td style={cellStyle}>{idx + 1}</td>
                  <td style={cellStyle}>{s.classCode || 'N/A'}</td>
                  <td style={cellStyle}>{s.teacherName || 'N/A'}</td>
                  <td style={cellStyle}>{s.userName || 'N/A'}</td>
                  <td style={cellStyle}>{s.correct}</td>
                  <td style={cellStyle}>{s.total}</td>
                  <td style={cellStyle}>{s.band != null && Number.isFinite(Number(s.band)) ? Number(s.band).toFixed(1) : 'N/A'}</td>
                  <td style={cellStyle}>{new Date(s.createdAt).toLocaleString()}</td>
                  <td style={cellStyle}>
                    <button onClick={() => navigate(`/reading-results/${s.id}`)} style={actionBtn}>View</button>
                    <button onClick={async () => {
                      try {
                        const res = await fetch(`${API}/api/reading-submissions/${s.id}`);
                        if (!res.ok) throw new Error('Failed');
                        const j = await res.json();
                        alert(JSON.stringify(j.answers || j, null, 2));
                      } catch (err) {
                        alert('Không thể tải JSON: ' + err.message);
                      }
                    }} style={{ ...actionBtn, marginLeft: 8, background: '#6b7280' }}>Raw JSON</button>
=======
                <tr key={s.id} style={{ borderBottom: "1px solid #eee" }}>
                  <td style={cellStyle}>{idx + 1}</td>
                  <td style={cellStyle}>{s.classCode || "N/A"}</td>
                  <td style={cellStyle}>{s.teacherName || "N/A"}</td>
                  <td style={cellStyle}>{s.userName || "N/A"}</td>
                  <td style={cellStyle}>{s.correct}</td>
                  <td style={cellStyle}>{s.total}</td>
                  <td style={cellStyle}>
                    {s.band != null && Number.isFinite(Number(s.band))
                      ? Number(s.band).toFixed(1)
                      : "N/A"}
                  </td>
                  <td style={cellStyle}>
                    {new Date(s.createdAt).toLocaleString()}
                  </td>
                  <td style={cellStyle}>
                    <button
                      onClick={() => navigate(`/reading-results/${s.id}`)}
                      style={actionBtn}
                    >
                      View
                    </button>
                    <button
                      onClick={async () => {
                        try {
                          const res = await fetch(
                            apiPath(`reading-submissions/${s.id}`)
                          );
                          if (!res.ok) throw new Error("Failed");
                          const j = await res.json();
                          alert(JSON.stringify(j.answers || j, null, 2));
                        } catch (err) {
                          alert("Không thể tải JSON: " + err.message);
                        }
                      }}
                      style={{
                        ...actionBtn,
                        marginLeft: 8,
                        background: "#6b7280",
                      }}
                    >
                      Raw JSON
                    </button>
>>>>>>> main
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </>
  );
};

<<<<<<< HEAD
const cellStyle = { padding: 8, border: '1px solid #ddd', textAlign: 'left' };
const actionBtn = { padding: '6px 12px', background: '#0e276f', color: '#fff', border: 'none', borderRadius: 6, cursor: 'pointer' };
=======
const cellStyle = { padding: 8, border: "1px solid #ddd", textAlign: "left" };
const actionBtn = {
  padding: "6px 12px",
  background: "#0e276f",
  color: "#fff",
  border: "none",
  borderRadius: 6,
  cursor: "pointer",
};
>>>>>>> main

export default AdminReadingSubmissions;
