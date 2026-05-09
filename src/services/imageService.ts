import axios from 'axios';

export interface PlaceImage {
  image_id: string;
  url: string;
  alt: string;
  author: string;
  source: string;
}

export async function fetchPlaceImages(place: string, state: string = '', tags: string[] = []): Promise<PlaceImage[]> {
  try {
    const response = await axios.get('/api/images', {
      params: {
        place,
        state,
        tags: tags.join(','),
      },
    });
    return response.data;
  } catch (error) {
    console.error('Error fetching images from backend:', error);
    return [];
  }
}
