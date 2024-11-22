const API_URL = import.meta.env.PUBLIC_API_URL;

export const fetchData = async (endpoint: string, options = {}) => {
    try {
        const response = await fetch(`${API_URL}/${endpoint}`, options);
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        return response.json();
    } catch (error) {
        console.error('Fetch error:', error);
        throw error;
    }
}