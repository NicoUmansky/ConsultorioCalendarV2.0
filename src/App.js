import './App.css';
import { useSession, useSupabaseClient, useSessionContext } from '@supabase/auth-helpers-react';
import DateTimePicker from 'react-datetime-picker';
import { useState } from 'react';
import { FaWhatsapp } from 'react-icons/fa';



function App() {
  const [eventsList, setEventsList] = useState([]);
  const [calendarID, setCalendarID] = useState("");
  const [showEvents, setShowEvents] = useState(false);
  const [editingEvent, setEditingEvent] = useState(null);
  const [editEventName, setEditEventName] = useState("");
  const [editEventDescription, setEditEventDescription] = useState("");
  const [editStart, setEditStart] = useState(new Date());
  const [editEnd, setEditEnd] = useState(new Date());
  const [eventsContainerStyle, setEventsContainerStyle] = useState({ display: 'none' });
  const [showContactOptions, setShowContactOptions] = useState(false);
  const [connectionsData, setConnectionsData] = useState(null);
  const [contactOptions, setContactOptions] = useState([]);


  const session = useSession(); // tokens, when session exists we have a user
  const supabase = useSupabaseClient(); // talk to supabase!
  const { isLoading } = useSessionContext();
  
  if(isLoading) {
    return <></>
  }



  async function googleSignIn() {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        scopes: ['https://www.googleapis.com/auth/calendar', 'https://www.googleapis.com/auth/contacts']
      }
    });
    if(error) {
      alert("Error logging in to Google provider with Supabase");
      console.log(error);
    }
    else {
      console.log("Logged in to Google provider with Supabase");
    }
  }

  async function signOut() {
    await supabase.auth.signOut();
  }
  async function createCalendarEvent() {
    console.log("Creating calendar event");
    const calendarName = 'ConsultorioCalendar';
  
    // Get all calendars
    const calendarsResponse = await fetch("https://www.googleapis.com/calendar/v3/users/me/calendarList", {
      method: "GET",
      headers: {
        'Authorization': 'Bearer ' + session.provider_token,
      },
    });
  
    if (!calendarsResponse.ok) {
      console.error("Error fetching calendars:", calendarsResponse.statusText);
      alert("Error de sesión, por favor iniciar nuevamente.");
      return;
    }
  
    const calendarsData = await calendarsResponse.json();
    const existingCalendar = calendarsData.items.find(calendar => calendar.summary === calendarName);
  
    let CalendarId;
    if (!existingCalendar) {
      // Calendar not found, create it
      const createCalendarResponse = await fetch("https://www.googleapis.com/calendar/v3/calendars", {
        method: "POST",
        headers: {
          'Authorization': 'Bearer ' + session.provider_token,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          summary: calendarName,
          timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
        }),
      });
  
      if (!createCalendarResponse.ok) {
        console.error("Error creating calendar:", createCalendarResponse.statusText);
        alert("Error creando calendario, prueba de nuevo.");
        return;
      }
      
      const createdCalendarData = await createCalendarResponse.json();
      CalendarId = createdCalendarData.id
    } else {
      // Calendar found, use its id
      CalendarId = existingCalendar.id
    }
  
    // Create the event
    const event = {
      'summary': editEventName,
      'description': editEventDescription,
      'start': {
        'dateTime': editStart.toISOString(),
        'timeZone': Intl.DateTimeFormat().resolvedOptions().timeZone,
      },
      'end': {
        'dateTime': editEnd.toISOString(),
        'timeZone': Intl.DateTimeFormat().resolvedOptions().timeZone,
      }
    };
  
    // Add event to the specified calendar
    const createEventResponse = await fetch(`https://www.googleapis.com/calendar/v3/calendars/${CalendarId}/events`, {
      method: "POST",
      headers: {
        'Authorization': 'Bearer ' + session.provider_token,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(event),
    });
  
    if (createEventResponse.ok) {
      alert("Evento creado! Revisa tu calendario");
      setEditEventName("");
      setEditEventDescription("");
      setEditStart(new Date());
      setEditEnd(new Date());
      fetchCalendarEvents();

    } else {
      console.error("Error creating event:", createEventResponse.statusText);
      alert("Error creating event. Please try again.");
    }
  }
  async function deleteCalendarEvent(eventId) {
    let calendarName = 'ConsultorioCalendar';
    const calendarsResponse = await fetch("https://www.googleapis.com/calendar/v3/users/me/calendarList", {
      method: "GET",
      headers: {
        'Authorization': 'Bearer ' + session.provider_token,
      },
    });
  
    if (!calendarsResponse.ok) {
      console.error("Error fetching calendars:", calendarsResponse.statusText);
      alert("Error fetching calendars. Please try again.");
      return;
    }
  
    const calendarsData = await calendarsResponse.json();
    const existingCalendar = calendarsData.items.find(calendar => calendar.summary === calendarName);
    let idCalendario;

    
    if (existingCalendar) {
      idCalendario = existingCalendar.id;
      setCalendarID(idCalendario)
    }
    // Función para eliminar un evento del calendario
    const response = await fetch(`https://www.googleapis.com/calendar/v3/calendars/${idCalendario}/events/${eventId}`, {
      method: "DELETE",
      headers: {
        'Authorization': 'Bearer ' + session.provider_token,
      },
    });

    if (response.ok) {
      console.log(`Event with ID ${eventId} deleted.`);
      // Recargar la lista de eventos después de la eliminación
      fetchCalendarEvents();
    } else {
      console.error("Error deleting event:", response.statusText);
      alert("Error deleting event. Please try again.");
    }
  }
  async function handleRecordarTurno() {
    fetchCalendarEvents(); // Asegurarse de tener los eventos más actualizados
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    console.log("Mañana es:", tomorrow);
    console.log("Eventos:", eventsList);
  
    const tomorrowEvents = eventsList.filter(event => {
      const eventDate = new Date(event.start.dateTime);
      return (
        eventDate.getFullYear() === tomorrow.getFullYear() &&
        eventDate.getMonth() === tomorrow.getMonth() &&
        eventDate.getDate() === tomorrow.getDate()
      );
    });
    // Obtener el número de teléfono para cada paciente
    const patientContacts = await Promise.all(tomorrowEvents.map(event => getContactPhoneNumbers(event.summary, event.id)));
    if (!patientContacts) {
      alert("Error obteniendo los números de teléfono de los pacientes. Por favor, inténtalo de nuevo.");
      return;
    }
  
    // Llamar a enviarMensajeWhatsApp para cada paciente
    patientContacts.forEach(patient => {
      if (patient) {
        enviarMensajeWhatsApp(patient.name, formatDate(tomorrowEvents.find(event => event.summary === patient.name).start.dateTime), tomorrowEvents.find(event => event.summary === patient.name).id);
      }
    });
  }
  
  const ak = "AIzaSyC1IHKQnsY55E_ofEqmbIIiv5NaBX18d20"

  async function getContactPhoneNumbers(contactName, eventId) {
    try {
      const connectionsResponse = await fetch(`https://people.googleapis.com/v1/people:searchContacts?pageSize=15&query=${contactName}&readMask=phoneNumbers%2Cnames&key=${ak}`, {
        method: "GET",
        headers: {
          'Authorization': 'Bearer ' + session.provider_token,
        },
      });
  
      if (!connectionsResponse.ok) {
        console.error("Error obteniendo la lista de contactos:", connectionsResponse.statusText);
        return null;
      }
  
      const connectionsData = await connectionsResponse.json();
      console.log("Contactos:", connectionsData);
  
      if (!connectionsData.results || connectionsData.results.length === 0 || !connectionsData.results[0].person) {
        // El contacto no existe, mostrar un popup para agregar el nuevo contacto
        const shouldCreateContact = window.confirm(`El contacto ${contactName} no existe. ¿Deseas crearlo?`);
  
        if (shouldCreateContact) {
          const phoneNumber = prompt("Ingresa el número de teléfono:");
          if (!phoneNumber) {
            alert("Número de teléfono no válido. La operación fue cancelada.");
            return null;
          }
  
          // Crear el nuevo contacto
          await createContact(contactName, phoneNumber);
  
          // Volver a buscar el contacto después de la creación
          return await getContactPhoneNumbers(contactName);
        } else {
          return null; // Usuario decidió no crear el contacto
        }
      } 
      else if (connectionsData.results.length === 1) {
        const personName = connectionsData.results[0].person.names[0].displayName;
        const personPhoneNumbers = connectionsData.results[0].person.phoneNumbers[0].value;
        let dataPatient = {
          name: personName,
          phone: personPhoneNumbers
        };
        console.log(dataPatient);
        return dataPatient;
      }     
      else if (connectionsData.results.length > 1) {
        // Hay más de un contacto con ese nombre, debe elegir el deseado

        const options = connectionsData.results.map((result, index) => {
          const contact = result.person;
          return {
            index: index + 1,
            displayName: contact.names[0].displayName,
            eventId: eventId
          };
        });
        setContactOptions(options);
        setConnectionsData(connectionsData)
        console.log(options);
        setShowContactOptions(true);

      }


    } catch (error) {
      console.error('Error al obtener los números de teléfono de los contactos:', error.message);
      return null;
    }
  }

  const handleContactOptionConfirm = async () => {
    try {
      const index = parseInt(document.querySelector("#contactOptionsSelect").value);
      if (!index || index < 1 || index > contactOptions.length) {
        alert("Opción no válida. La operación fue cancelada.");
        return;
      }
  
      // Obtener el contacto seleccionado
      const selectedContact = connectionsData.results[index - 1].person;
  
      // Obtener detalles del evento (fecha de inicio y fecha de fin)
      const eventDetailsResponse = await fetch(
        `https://www.googleapis.com/calendar/v3/calendars/${calendarID}/events/${contactOptions[index - 1].eventId}`,
        {
          method: "GET",
          headers: {
            'Authorization': 'Bearer ' + session.provider_token,
          },
        }
      );
  
      if (!eventDetailsResponse.ok) {
        console.error("Error obteniendo detalles del evento:", eventDetailsResponse.statusText);
        alert("Error obteniendo detalles del evento. La operación fue cancelada.");
        return;
      }
  
      const eventDetailsData = await eventDetailsResponse.json();
      if (eventDetailsData.start && eventDetailsData.end) {
        // Detalles del evento obtenidos con éxito
  
        // Crear el objeto updatedEvent con los detalles del evento
        const updatedEvent = {
          summary: selectedContact.names[0].displayName,
          eventId: contactOptions[index - 1].eventId,
          start: {
            dateTime: eventDetailsData.start.dateTime,
            timeZone: eventDetailsData.start.timeZone,
          },
          end: {
            dateTime: eventDetailsData.end.dateTime,
            timeZone: eventDetailsData.end.timeZone,
          },
        };
  
        // Actualizar el evento en el calendario
        await updateCalendarEvent(updatedEvent);
  
        // Cierra el modal
        setShowContactOptions(false);
        // enviarMensajeWhatsApp(updatedEvent.summary, updatedEvent.start.dateTime, updatedEvent.eventId)
       } else {
        console.error("Detalles del evento no encontrados.");
        alert("Detalles del evento no encontrados. La operación fue cancelada.");
      }
    } catch (error) {
      console.error('Error al confirmar la opción del contacto:', error.message);
    }
  };
  
  // Función para actualizar el evento en el calendario
  const updateCalendarEvent = async (updatedEvent) => {
    try {  
      const updateEventResponse = await fetch(
        `https://www.googleapis.com/calendar/v3/calendars/${calendarID}/events/${updatedEvent.eventId}`,
        {
          method: "PUT",
          headers: {
            'Authorization': 'Bearer ' + session.provider_token,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(updatedEvent),
        }
      );
  
      if (updateEventResponse.ok) {
        console.log(`Event with ID ${updatedEvent.id} updated.`);
        // Recargar la lista de eventos después de la actualización
        fetchCalendarEvents();
      } else {
        console.error("Error updating event:", updateEventResponse.statusText);
        alert("Error updating event. Please try again.");
      }
    } catch (error) {
      console.error('Error al actualizar el evento:', error.message);
    }
  };
  async function createContact(contactName, phoneNumber) {
    try {
      // Dividir el nombre completo en nombre y apellido
      const [givenName, familyName] = contactName.split(" ");
  
      const createContactResponse = await fetch(`https://people.googleapis.com/v1/people:createContact?key=${ak}`, {
        method: "POST",
        headers: {
          'Authorization': 'Bearer ' + session.provider_token,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          "names": [
            {
              "givenName": givenName,
              "familyName": familyName || "", // En caso de que no haya apellido
            }
          ],
          "phoneNumbers": [
            {
              "value": phoneNumber
            }
          ]
        }),
      });
  
      if (!createContactResponse.ok) {
        console.error("Error creando el contacto:", createContactResponse.statusText);
        alert("Error creando el contacto. Por favor, inténtalo de nuevo.");
        return null;
      }
      
      const createdContactData = await createContactResponse.json();
      console.log("Contacto creado:", createdContactData);
      return createdContactData;
  
    } catch (error) {
      console.error('Error al crear el contacto:', error.message);
      return null;
    }
  }
  
  
  
  

  async function fetchCalendarEvents() {
    const calendarName = 'ConsultorioCalendar';

    // Obtener el ID del calendario
    const calendarsResponse = await fetch("https://www.googleapis.com/calendar/v3/users/me/calendarList", {
      method: "GET",
      headers: {
        'Authorization': 'Bearer ' + session.provider_token,
      },
    });


    const calendarsData = await calendarsResponse.json();
    const existingCalendar = calendarsData.items.find(calendar => calendar.summary === calendarName);

    if (!existingCalendar) {
      alert(`Calendar "${calendarName}" not found.`);
      return;
    }

    const idCalendario = existingCalendar.id;
    setCalendarID(idCalendario);

    // Obtener eventos del calendario
    const eventsResponse = await fetch(`https://www.googleapis.com/calendar/v3/calendars/${idCalendario}/events`, {
      method: "GET",
      headers: {
        'Authorization': 'Bearer ' + session.provider_token,
      },
    });

    if (!eventsResponse.ok) {
      console.error("Error fetching events:", eventsResponse.statusText);
      alert("Error mostrando eventos, volver a intentar.");
      return;
    }

    const eventsData = await eventsResponse.json();
    if (eventsData.items.length === 0) {
      alert("No hay eventos.");
    }

    // Ordenar eventos por fecha y hora
    const sortedEvents = eventsData.items.sort((a, b) => new Date(a.start.dateTime) - new Date(b.start.dateTime));

    // Actualizar el estado para mostrar la lista de eventos en pantalla
    setEventsList(sortedEvents);
    setEventsContainerStyle({ display: 'grid' });

  }
  const getPastelColor = (index) => {
    const pastelColors = ['#ffd1dc','#00ced1', '#a2cd5a' , '#afeeee', '#a4d3e8', '#98fb98', '#ffb6c1', '#ff91a4', '#ff7f50', '#ff6347'];
    return pastelColors[index % pastelColors.length];
  };

  function formatDate(dateString) {
    const options = { day: 'numeric', month: 'numeric', year: 'numeric', hour: 'numeric', minute: 'numeric', hour12: false };
    return new Intl.DateTimeFormat('es-AR', options).format(new Date(dateString));
  }
  async function enviarMensajeWhatsApp(name, startTime, eventId) {
    const dataPatient = await getContactPhoneNumbers(name, eventId);
    let phone = "";
    if(dataPatient.phone){
      phone = dataPatient.phone;
    }

    if (!phone) {
      alert("Error obteniendo el número de teléfono del paciente. Por favor, inténtalo de nuevo.");
      return;
    }
  
    // Elimina caracteres no numéricos
    const cleanedPhone = phone.replace(/\D/g, '');
    if (cleanedPhone.length === 13){
      const inicio = startTime.split(" ")[1];
      const message = `Hola ${name}, te recuerdo que mañana a las ${inicio} tenés un turno reservado en el consultorio odontológico en Cerviño 3527, 1A. En el caso de que no pudieras venir, por favor notifícalo. ¡Gracias!`;
  
      // alert(`El número de teléfono de ${name} es ${cleanedPhone}`);
      const whatsappLink = `https://wa.me/+${cleanedPhone}?text=${encodeURIComponent(message)}`;
  
      // Abre la ventana de WhatsApp con el mensaje predefinido
      window.open(whatsappLink, '_blank');
  
    }
    else if(cleanedPhone.length === 10){
      const inicio = startTime.split(" ")[1];
      const message = `Hola ${name}, te recuerdo que mañana a las ${inicio} tenés un turno reservado en el consultorio odontológico en Cerviño 3527, 1A. En el caso de que no pudieras venir, por favor notifícalo. ¡Gracias!`;
  
      alert(`El número de teléfono de ${name} es +549${phone}`);
      const whatsappLink = `https://wa.me/+549${cleanedPhone}?text=${encodeURIComponent(message)}`;
  
      // Abre la ventana de WhatsApp con el mensaje predefinido
      window.open(whatsappLink, '_blank');
    }
    else if (cleanedPhone.length === 8){
      const inicio = startTime.split(" ")[1];
      const message = `Hola ${name}, te recuerdo que mañana a las ${inicio} tenés un turno reservado en el consultorio odontológico en Cerviño 3527, 1A. En el caso de que no pudieras venir, por favor notifícalo. ¡Gracias!`;
  
      alert(`El número de teléfono de ${name} es +54911${cleanedPhone}`);
      const whatsappLink = `https://wa.me/+54911${cleanedPhone}?text=${encodeURIComponent(message)}`;
  
      // Abre la ventana de WhatsApp con el mensaje predefinido
      window.open(whatsappLink, '_blank');
  
    }

  }
  const handleStartChange = (newStart) => {
    // Actualizar la hora de inicio
    setEditStart(newStart);

    // Calcular la hora de finalización (1 hora después de la hora de inicio)
    const newEnd = new Date(newStart);
    newEnd.setHours(newEnd.getHours() + 1);
    setEditEnd(newEnd);
  };

  const handleEditEvent = (event) => {
    // Al hacer clic en el botón de edición, establecer el evento actual en el estado
    setEditingEvent(event);
  
    // Elimina la llamada a deleteCalendarEvent, ya que esto podría afectar la obtención del ID
    deleteCalendarEvent(event.id);
  
    // Asegúrate de que el ID del evento esté definido antes de usarlo
    if (event.id) {
      // Cargar los datos del evento en los estados específicos para la edición
      setEditEventName(event.summary || "");
      setEditEventDescription(event.description || "");
      setEditStart(new Date(event.start.dateTime));
      setEditEnd(new Date(event.end.dateTime));
    } else {
      console.error("ID del evento no definido.");
      // Puedes mostrar un mensaje de error o manejar la situación de otra manera
    }
  };
  return (
    <div className="App">
      <div className="container">
        {session ? (
          <>
            <h2>Hey there {session.user.identities[0].identity_data.full_name}</h2>
            <button style= {{backgroundColor: "red"}}onClick={() => signOut()}><b>Sign Out</b></button>
            <hr />
            <p><b>Inicio de tu Evento</b></p>
            <DateTimePicker onChange={handleStartChange} value={editStart} />
            <p><b>Finalizacion de tu Evento</b></p>
            <DateTimePicker onChange={setEditEnd} value={editEnd} />
            <b><p>Nombre Paciente</p></b>
            <input placeholder="Nombre del Paciente" type="text" onChange={(e) => setEditEventName(e.target.value)} value={editEventName} />
            <b><p>Observacion</p></b>
            <input placeholder="Observaciones" type="text" onChange={(e) => setEditEventDescription(e.target.value)} value={editEventDescription} />
            <button onClick={() => createCalendarEvent()}><b>Crear Evento</b></button>
            <p></p>
            <hr />
            <button onClick={() => {
              setShowEvents(!showEvents);
              if (!showEvents) {
                fetchCalendarEvents();
              } else {
                setEventsContainerStyle({ display: 'none' });
              }
            }}>
              <b>{showEvents ?  'Ocultar Eventos' : 'Ver Eventos Creados'}</b>
            </button>  
            <button className="recordar-turno-btn" onClick={() => handleRecordarTurno()}><b>Recordar Turno</b></button>

            <div className="events-grid" style={eventsContainerStyle}>
            {eventsList.map((event, index) => (
              <div key={event.id} className="event-item" style={{ backgroundColor: getPastelColor(index) }}>
                <h4>{event.summary}</h4>
                <p><b>Inicio:</b> {formatDate(event.start.dateTime)}</p>
                <p><b>Fin:</b> {formatDate(event.end.dateTime)}</p>
                {event.description && <p><b>Descripción:</b> {event.description}</p>}
                <button className="recordar-turno-btn" onClick={() => enviarMensajeWhatsApp(event.summary, formatDate(event.start.dateTime), event.id)}>
              <FaWhatsapp /> Notificar a un Paciente
            </button>
                <button onClick={() => deleteCalendarEvent(event.id)}>🗑️</button>
                <button className="edit-event-btn" onClick={() => handleEditEvent(event)}>✏️</button>
                <hr />
              </div>
            ))}
            {showContactOptions && (
        <div className="contact-options-modal">
          <button className="close-modal-btn" onClick={() => setShowContactOptions(false)}>x</button>
          <p className='text-modal'>Selecciona el contacto deseado:</p>
          <select id="contactOptionsSelect">
            {contactOptions.map((option) => (
                <option id={option.eventId}key={option.index} value={option.index}>
                  {option.displayName}
                </option>
            ))}
          </select>
          <button onClick={handleContactOptionConfirm}>
            Confirmar
          </button>
        </div>
      )}
          </div>
          </>
          
        ) : (
          <>
            <button onClick={() => googleSignIn()}>Inicia Sesion con Google</button>
          </>
        )}
      </div>
    </div>
  );
}


export default App;
