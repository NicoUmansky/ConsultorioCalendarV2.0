import './App.css';
import { useSession, useSupabaseClient, useSessionContext } from '@supabase/auth-helpers-react';
import DateTimePicker from 'react-datetime-picker';
import { useState, useEffect } from 'react';
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

  const session = useSession();
  const supabase = useSupabaseClient();
  const { isLoading } = useSessionContext();

  useEffect(() => {
    if (session) {
      fetchCalendarID();
    }
  }, [session]);

  if (isLoading) {
    return <></>;
  }

  const ak = "AIzaSyC1IHKQnsY55E_ofEqmbIIiv5NaBX18d20";

  const googleSignIn = async () => {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        scopes: ['https://www.googleapis.com/auth/calendar', 'https://www.googleapis.com/auth/contacts']
      }
    });
    if (error) {
      alert("Error logging in to Google provider with Supabase");
      console.log(error);
    } else {
      console.log("Logged in to Google provider with Supabase");
    }
  };

  const signOut = async () => {
    await supabase.auth.signOut();
  };

  const fetchCalendarID = async () => {
    const calendarName = 'ConsultorioCalendar';
    const calendarsResponse = await fetch("https://www.googleapis.com/calendar/v3/users/me/calendarList", {
      method: "GET",
      headers: {
        'Authorization': 'Bearer ' + session.provider_token,
      },
    });

    if (!calendarsResponse.ok) {
      alert("Error de sesión, por favor iniciar nuevamente.");
      return;
    }

    const calendarsData = await calendarsResponse.json();
    const existingCalendar = calendarsData.items.find(calendar => calendar.summary === calendarName);

    if (existingCalendar) {
      setCalendarID(existingCalendar.id);
    } else {
      createCalendar(calendarName);
    }
  };

  const createCalendar = async (calendarName) => {
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
      alert("Error creando calendario, prueba de nuevo.");
      return;
    }

    const createdCalendarData = await createCalendarResponse.json();
    setCalendarID(createdCalendarData.id);
  };

  const createCalendarEvent = async () => {
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

    const createEventResponse = await fetch(`https://www.googleapis.com/calendar/v3/calendars/${calendarID}/events`, {
      method: "POST",
      headers: {
        'Authorization': 'Bearer ' + session.provider_token,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(event),
    });

    if (createEventResponse.ok) {
      alert("Evento creado! Revisa tu calendario");
      clearEventForm();
      fetchCalendarEvents();
    } else {
      alert("Error creating event. Please try again.");
    }
  };

  const clearEventForm = () => {
    setEditEventName("");
    setEditEventDescription("");
    setEditStart(new Date());
    setEditEnd(new Date());
  };

  const deleteCalendarEvent = async (eventId) => {
    const response = await fetch(`https://www.googleapis.com/calendar/v3/calendars/${calendarID}/events/${eventId}`, {
      method: "DELETE",
      headers: {
        'Authorization': 'Bearer ' + session.provider_token,
      },
    });

    if (response.ok) {
      fetchCalendarEvents();
    } else {
      alert("Error deleting event. Please try again.");
    }
  };

  const fetchCalendarEvents = async () => {
    const eventsResponse = await fetch(`https://www.googleapis.com/calendar/v3/calendars/${calendarID}/events`, {
      method: "GET",
      headers: {
        'Authorization': 'Bearer ' + session.provider_token,
      },
    });

    if (!eventsResponse.ok) {
      alert("Error mostrando eventos, volver a intentar.");
      return;
    }

    const eventsData = await eventsResponse.json();
    if (eventsData.items.length === 0) {
      alert("No hay eventos.");
    }

    const sortedEvents = eventsData.items.sort((a, b) => new Date(a.start.dateTime) - new Date(b.start.dateTime));
    setEventsList(sortedEvents);
    setEventsContainerStyle({ display: 'grid' });
  };

  const getContactPhoneNumbers = async (contactName, eventId) => {
    try {
      const connectionsResponse = await fetch(`https://people.googleapis.com/v1/people:searchContacts?pageSize=15&query=${contactName}&readMask=phoneNumbers%2Cnames&key=${ak}`, {
        method: "GET",
        headers: {
          'Authorization': 'Bearer ' + session.provider_token,
        },
      });

      if (!connectionsResponse.ok) {
        return null;
      }

      const connectionsData = await connectionsResponse.json();

      if (!connectionsData.results || connectionsData.results.length === 0 || !connectionsData.results[0].person) {
        const shouldCreateContact = window.confirm(`El contacto ${contactName} no existe. ¿Deseas crearlo?`);
        if (shouldCreateContact) {
          const phoneNumber = prompt("Ingresa el número de teléfono:");
          if (!phoneNumber) {
            alert("Número de teléfono no válido. La operación fue cancelada.");
            return null;
          }
          await createContact(contactName, phoneNumber);
          return await getContactPhoneNumbers(contactName);
        } else {
          return null;
        }
      } else if (connectionsData.results.length === 1) {
        const person = connectionsData.results[0].person;
        return {
          name: person.names[0].displayName,
          phone: person.phoneNumbers[0].value,
        };
      } else {
        const options = connectionsData.results.map((result, index) => ({
          index: index + 1,
          displayName: result.person.names[0].displayName,
          eventId: eventId,
        }));
        setContactOptions(options);
        setConnectionsData(connectionsData);
        setShowContactOptions(true);
      }
    } catch (error) {
      return null;
    }
  };

  const createContact = async (contactName, phoneNumber) => {
    const [givenName, familyName] = contactName.split(" ");
    const createContactResponse = await fetch(`https://people.googleapis.com/v1/people:createContact?key=${ak}`, {
      method: "POST",
      headers: {
        'Authorization': 'Bearer ' + session.provider_token,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        "names": [{ "givenName": givenName, "familyName": familyName || "" }],
        "phoneNumbers": [{ "value": phoneNumber }]
      }),
    });

    if (!createContactResponse.ok) {
      alert("Error creando el contacto. Por favor, inténtalo de nuevo.");
      return null;
    }

    return await createContactResponse.json();
  };

  const handleContactOptionConfirm = async () => {
    try {
      const index = parseInt(document.querySelector("#contactOptionsSelect").value);
      if (!index || index < 1 || index > contactOptions.length) {
        alert("Opción no válida. La operación fue cancelada.");
        return;
      }

      const selectedContact = connectionsData.results[index - 1].person;
      const eventDetailsResponse = await fetch(`https://www.googleapis.com/calendar/v3/calendars/${calendarID}/events/${contactOptions[index - 1].eventId}`, {
        method: "GET",
        headers: {
          'Authorization': 'Bearer ' + session.provider_token,
        },
      });

      if (!eventDetailsResponse.ok) {
        alert("Error mostrando eventos, volver a intentar.");
        return;
      }

      const eventDetails = await eventDetailsResponse.json();
      const startDateTime = new Date(eventDetails.start.dateTime);
      const endDateTime = new Date(eventDetails.end.dateTime);

      const message = `Hola ${selectedContact.names[0].displayName}, tienes un evento llamado ${eventDetails.summary} desde el ${startDateTime.toLocaleString()} hasta el ${endDateTime.toLocaleString()}.`;
      const phoneNumber = selectedContact.phoneNumbers[0].value.replace(/\s+/g, "");

      sendWhatsAppMessage(phoneNumber, message);
      setShowContactOptions(false);
    } catch (error) {
      alert("Error enviando el mensaje. Por favor, inténtalo de nuevo.");
    }
  };

  const sendWhatsAppMessage = (phoneNumber, message) => {
    const whatsappUrl = `https://wa.me/${phoneNumber}?text=${encodeURIComponent(message)}`;
    window.open(whatsappUrl, "_blank");
  };

  return (
    <div className="App">
      <h1>Consultorio Calendario</h1>
      {!session ? (
        <button onClick={googleSignIn}>Google Sign In</button>
      ) : (
        <div>
          <button onClick={signOut}>Cerrar sesión</button>
          <button onClick={fetchCalendarEvents}>Mostrar Eventos</button>
        </div>
      )}

      <div>
        <input
          type="text"
          placeholder="Nombre del evento"
          value={editEventName}
          onChange={(e) => setEditEventName(e.target.value)}
        />
        <textarea
          placeholder="Descripción del evento"
          value={editEventDescription}
          onChange={(e) => setEditEventDescription(e.target.value)}
        />
        <DateTimePicker
          onChange={setEditStart}
          value={editStart}
        />
        <DateTimePicker
          onChange={setEditEnd}
          value={editEnd}
        />
        <button onClick={createCalendarEvent}>Crear Evento</button>
      </div>

      {showContactOptions && (
        <div>
          <h2>Selecciona el contacto:</h2>
          <select id="contactOptionsSelect">
            {contactOptions.map((option) => (
              <option key={option.index} value={option.index}>
                {option.index}. {option.displayName}
              </option>
            ))}
          </select>
          <button onClick={handleContactOptionConfirm}>Confirmar</button>
        </div>
      )}

      {showEvents && (
        <div className="events-container" style={eventsContainerStyle}>
          {eventsList.map((event) => (
            <div key={event.id} className="event-item">
              <h2>{event.summary}</h2>
              <p>{event.description}</p>
              <p>Inicio: {new Date(event.start.dateTime).toLocaleString()}</p>
              <p>Fin: {new Date(event.end.dateTime).toLocaleString()}</p>
              <button onClick={() => deleteCalendarEvent(event.id)}>Eliminar</button>
              <button onClick={() => getContactPhoneNumbers(event.summary, event.id)}>
                <FaWhatsapp /> Enviar mensaje
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default App;