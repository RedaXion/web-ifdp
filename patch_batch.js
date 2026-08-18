app.post('/api/paidagogo/grades/batch', authRole(['paidagogo', 'admin']), upload.single('archivoNoa'), async (req, res) => {
  try {
    const { evaluacionId, unidad, puntajeTotal, gradesData } = req.body;
    const pTotal = parseFloat(puntajeTotal);
    const parsedGrades = JSON.parse(gradesData);
    
    for (const [studentId, puntajeObtenido] of Object.entries(parsedGrades)) {
      if(puntajeObtenido === '') continue;
      const pObtenido = parseFloat(puntajeObtenido);
      const exigencia = pTotal * 0.6;
      let nota = 1.0;
      if (pObtenido < exigencia) {
        nota = (pObtenido / exigencia) * 3 + 1;
      } else {
        nota = ((pObtenido - exigencia) / (pTotal * 0.4)) * 3 + 4;
      }
      nota = Math.round(nota * 10) / 10;
      if(nota < 1.0) nota = 1.0; if(nota > 7.0) nota = 7.0;
      const porcentaje = Math.round((pObtenido / pTotal) * 100);
      const newId = 'g_' + Date.now() + '_' + studentId;
      
      await pool.query(
        'INSERT INTO grades (id, student_id, unidad, puntaje_obtenido, puntaje_total, nota, porcentaje, observaciones) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)',
        [newId, studentId, unidad, pObtenido, pTotal, nota, porcentaje, '']
      );
    }

    if (req.file) {
      const url = '/uploads/' + req.file.filename;
      await pool.query(
        'INSERT INTO nota_noa (pedagogo_id, evaluacion_id, archivo_url) VALUES ($1, $2, $3)',
        [req.session.user.id, evaluacionId, url]
      );
    }
    res.json({ success: true });
  } catch(err) {
    console.error(err);
    res.status(500).json({ error: 'Error del servidor' });
  }
});

