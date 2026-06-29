import psycopg2

conn = psycopg2.connect(host='localhost', database='erpdb', user='postgres', password='1234')
cursor = conn.cursor()

# Update admin password
admin_hash = '$2b$12$..1EqrhvX2RyzYGWv5wFXeDTkP0Q2yX7I5o1jvXqjFAjFQCn/pP1y'
cursor.execute("UPDATE users SET hashed_password = %s WHERE email = %s", (admin_hash, 'admin@campus.com'))

# Update student password  
student_hash = '$2b$12$..1EqrhvX2RyzYGWv5wFXeDTkP0Q2yX7I5o1jvXqjFAjFQCn/pP1y'
cursor.execute("UPDATE users SET hashed_password = %s WHERE email = %s", (student_hash, 'student@campus.com'))

conn.commit()
cursor.close()
conn.close()
print('Passwords updated successfully')
