"SELECT c.name as class_name, COUNT(cm.user_id) as student_count FROM classes c LEFT JOIN class_members cm ON c.id = cm.class_id GROUP BY c.id, c.name ORDER BY c.name;" 
