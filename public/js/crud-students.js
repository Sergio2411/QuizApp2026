import { db } from './config.js';

const tbody = document.getElementById('students-table-body');

// 1. Cargar Estudiantes
async function loadStudents() {
    try {
        const snapshot = await db.collection('users').get();
        
        if (snapshot.empty) {
            tbody.innerHTML = '<tr><td colspan="4" class="p-4 text-center text-slate-500">No hay estudiantes registrados en la base de datos.</td></tr>';
            return;
        }

        tbody.innerHTML = ''; // Limpiar tabla
        
        snapshot.forEach(doc => {
            const student = doc.data();
            const id = doc.id;
            
            // Renderizar fila
            const row = `
                <tr class="border-b hover:bg-slate-50">
                    <td class="p-3 text-2xl">${student.photoURL ? `<img src="${student.photoURL}" class="w-8 h-8 rounded-full">` : (student.emoji || '👤')}</td>
                    <td class="p-3 font-semibold">${student.displayName || student.name || 'Sin Nombre'}</td>
                    <td class="p-3 text-slate-600">${student.email || 'Invitado/Sin Email'}</td>
                    <td class="p-3 text-center">
                        <button onclick="deleteStudent('${id}', '${student.name || 'este usuario'}')" 
                                class="bg-red-100 text-red-600 hover:bg-red-200 px-3 py-1 rounded-lg font-bold text-sm transition-colors">
                            Eliminar
                        </button>
                    </td>
                </tr>
            `;
            tbody.innerHTML += row;
        });

    } catch (error) {
        console.error("Error cargando estudiantes:", error);
        tbody.innerHTML = '<tr><td colspan="4" class="p-4 text-center text-red-500">Error al conectar con la base de datos.</td></tr>';
    }
}

// 2. Función para eliminar (La exponemos al objeto window para poder usarla en el HTML)
window.deleteStudent = async (id, name) => {
    if (confirm(`¿Estás seguro de que quieres eliminar a ${name}? Se perderán sus medallas.`)) {
        try {
            await db.collection('users').doc(id).delete();
            alert("Estudiante eliminado.");
            loadStudents(); // Recargar tabla
        } catch (error) {
            console.error(error);
            alert("Error al eliminar.");
        }
    }
};

// Iniciar
document.addEventListener('DOMContentLoaded', loadStudents);