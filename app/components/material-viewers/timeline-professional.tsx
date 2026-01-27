'use client';
import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

type TimelineEvent = {
  date: string;
  title: string;
  description: string;
  fullDescription?: string;
  wikipediaUrl?: string;
};

type TimelineData = {
  type: 'timeline';
  events: Array<{
    date: string;
    title: string;
    description: string;
  }>;
  topic?: string; // For Wikipedia fetching
};

type ProfessionalTimelineRendererProps = {
  data: TimelineData;
};

export function ProfessionalTimelineRenderer({ data }: ProfessionalTimelineRendererProps) {
  const [events, setEvents] = useState<TimelineEvent[]>(data.events);
  const [selectedEvent, setSelectedEvent] = useState<TimelineEvent | null>(null);
  const [isLoadingWikipedia, setIsLoadingWikipedia] = useState(false);

  // Fetch additional data from Wikipedia if topic is provided
  useEffect(() => {
    if (data.topic && events.length === 0) {
      fetchWikipediaTimeline(data.topic);
    }
  }, [data.topic]);

  const fetchWikipediaTimeline = async (topic: string) => {
    setIsLoadingWikipedia(true);
    try {
      // Mock Wikipedia API call - replace with actual API
      const mockEvents: TimelineEvent[] = [
        {
          date: '1066-10-14',
          title: 'Battle of Hastings',
          description: 'William the Conqueror defeats Harold Godwinson, leading to Norman conquest of England.',
          fullDescription: 'William, Duke of Normandy, defeated King Harold II of England at the Battle of Hastings. This pivotal battle marked the beginning of the Norman Conquest of England, fundamentally changing the country\'s language, culture, and governance. The battle took place on October 14, 1066, and resulted in Harold\'s death and William\'s coronation as King of England.',
          wikipediaUrl: 'https://en.wikipedia.org/wiki/Battle_of_Hastings'
        },
        {
          date: '1215-06-15',
          title: 'Magna Carta Signed',
          description: 'King John of England signs the Magna Carta, limiting royal power.',
          fullDescription: 'On June 15, 1215, King John of England was forced by rebellious barons to sign the Magna Carta at Runnymede. This historic document established that the king was subject to the law and protected the rights of the barons. It became a cornerstone of constitutional law and influenced the development of democratic principles worldwide.',
          wikipediaUrl: 'https://en.wikipedia.org/wiki/Magna_Carta'
        },
        {
          date: '1348-01-01',
          title: 'Black Death Arrives',
          description: 'The bubonic plague reaches England, killing millions across Europe.',
          fullDescription: 'The Black Death, one of the most devastating pandemics in human history, arrived in England in 1348. Caused by the Yersinia pestis bacterium, it killed an estimated 30-60% of Europe\'s population. The plague fundamentally altered medieval society, leading to labor shortages, social upheaval, and significant economic changes.',
          wikipediaUrl: 'https://en.wikipedia.org/wiki/Black_Death_in_England'
        }
      ];

      setEvents(mockEvents);
    } catch (error) {
      console.error('Failed to fetch Wikipedia data:', error);
    } finally {
      setIsLoadingWikipedia(false);
    }
  };

  const formatDate = (dateString: string) => {
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
      });
    } catch {
      return dateString;
    }
  };

  const sortedEvents = [...events].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

  return (
    <div className="w-full h-full overflow-x-auto">
      <div className="relative min-w-max p-6">
        {/* Horizontal Timeline line */}
        <div className="absolute top-16 left-0 right-0 h-0.5 bg-gradient-to-r from-blue-500 via-purple-500 to-green-500"></div>

        {/* Events */}
        <div className="flex items-start justify-start gap-8 pb-8">
          {sortedEvents.map((event, index) => (
            <div key={index} className="relative flex flex-col items-center min-w-64">
              {/* Timeline dot */}
              <div className="absolute top-12 w-4 h-4 bg-white border-4 border-blue-500 rounded-full shadow-lg z-10"></div>

              {/* Date */}
              <div className="mb-4 text-center">
                <div className="text-sm font-medium text-gray-600 mb-1">
                  {formatDate(event.date)}
                </div>
              </div>

              {/* Event card */}
              <Card className="hover:shadow-lg transition-shadow cursor-pointer w-full" onClick={() => setSelectedEvent(event)}>
                <CardContent className="p-4">
                  <div className="text-center">
                    <h3 className="text-lg font-bold text-gray-900 mb-2 line-clamp-2">
                      {event.title.length > 50 ? event.title.substring(0, 50) + '...' : event.title}
                    </h3>
                    <p className="text-gray-600 text-sm leading-relaxed line-clamp-3">
                      {event.description}
                    </p>
                  </div>
                </CardContent>
              </Card>
            </div>
          ))}
        </div>

        {isLoadingWikipedia && (
          <div className="text-center py-8">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
            <p className="mt-2 text-gray-600">Fetching timeline data from Wikipedia...</p>
          </div>
        )}

        {events.length === 0 && !isLoadingWikipedia && (
          <div className="text-center py-12">
            <div className="text-gray-400 text-6xl mb-4">📅</div>
            <h3 className="text-xl font-semibold text-gray-900 mb-2">No Timeline Events</h3>
            <p className="text-gray-600">Add events to create a visual timeline of important dates and milestones.</p>
          </div>
        )}
      </div>

      {/* Event Detail Dialog */}
      <Dialog open={!!selectedEvent} onOpenChange={() => setSelectedEvent(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <div className="flex items-center gap-3 mb-2">
              <Badge variant="outline">
                {selectedEvent && formatDate(selectedEvent.date)}
              </Badge>
              {selectedEvent?.wikipediaUrl && (
                <a
                  href={selectedEvent.wikipediaUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-500 hover:text-blue-700 text-sm flex items-center gap-1"
                >
                  <span>📖</span> View on Wikipedia
                </a>
              )}
            </div>
            <DialogTitle className="text-2xl font-bold">
              {selectedEvent?.title}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <h4 className="font-semibold text-gray-900 mb-2">Summary</h4>
              <p className="text-gray-700 leading-relaxed">
                {selectedEvent?.description}
              </p>
            </div>

            {selectedEvent?.fullDescription && (
              <div>
                <h4 className="font-semibold text-gray-900 mb-2">Detailed Information</h4>
                <div className="bg-gray-50 p-4 rounded-lg">
                  <p className="text-gray-700 leading-relaxed">
                    {selectedEvent.fullDescription}
                  </p>
                </div>
              </div>
            )}

            <div className="flex items-center justify-between pt-4 border-t">
              <div className="text-sm text-gray-500">
                Click outside to close • Press Escape to dismiss
              </div>
              {selectedEvent?.wikipediaUrl && (
                <a
                  href={selectedEvent.wikipediaUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
                >
                  Learn More on Wikipedia
                </a>
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}