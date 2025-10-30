import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { MapPin, User, Hash, Grid } from "lucide-react";

interface SeatAllocationViewProps {
  allocation: {
    exam: any;
    student: any;
    hall: any;
    allSeats: any[];
  };
  onReset: () => void;
}

const SeatAllocationView = ({ allocation, onReset }: SeatAllocationViewProps) => {
  const { exam, student, hall, allSeats } = allocation;

  const rows = Math.ceil(hall.capacity / 10);
  const seatsPerRow = 10;

  const getSeatAt = (row: number, col: number) => {
    return allSeats.find(
      (s) => s.row_number === row && s.column_number === col
    );
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <Card className="p-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-3xl font-bold mb-2">{exam.exam_name}</h1>
            <p className="text-muted-foreground">Exam Code: {exam.exam_code}</p>
          </div>
          <div className="flex gap-2">
            <Button onClick={handlePrint}>Print Hall Ticket</Button>
            <Button variant="outline" onClick={onReset}>
              Search Again
            </Button>
          </div>
        </div>

        <div className="grid md:grid-cols-2 gap-4">
          <div className="flex items-center gap-3 p-4 bg-secondary/50 rounded-lg">
            <User className="h-5 w-5 text-primary" />
            <div>
              <p className="text-sm text-muted-foreground">Student Name</p>
              <p className="font-semibold">{student.student_name}</p>
            </div>
          </div>

          <div className="flex items-center gap-3 p-4 bg-secondary/50 rounded-lg">
            <Hash className="h-5 w-5 text-primary" />
            <div>
              <p className="text-sm text-muted-foreground">Registration Number</p>
              <p className="font-semibold">{student.registration_number}</p>
            </div>
          </div>

          <div className="flex items-center gap-3 p-4 bg-secondary/50 rounded-lg">
            <MapPin className="h-5 w-5 text-primary" />
            <div>
              <p className="text-sm text-muted-foreground">Hall Name</p>
              <p className="font-semibold">{hall.hall_name}</p>
            </div>
          </div>

          <div className="flex items-center gap-3 p-4 bg-secondary/50 rounded-lg">
            <Grid className="h-5 w-5 text-primary" />
            <div>
              <p className="text-sm text-muted-foreground">Seat Number</p>
              <p className="font-semibold">Seat {student.seat_number}</p>
            </div>
          </div>
        </div>
      </Card>

      <Card className="p-6">
        <h2 className="text-xl font-semibold mb-4">Hall Seating Layout</h2>
        <p className="text-sm text-muted-foreground mb-6">
          Your seat is highlighted in yellow
        </p>

        <div className="overflow-x-auto">
          <div className="min-w-[600px]">
            {Array.from({ length: rows }, (_, rowIndex) => (
              <div key={rowIndex} className="flex gap-2 mb-2">
                <div className="w-12 flex items-center justify-center text-sm font-semibold text-muted-foreground">
                  Row {rowIndex + 1}
                </div>
                {Array.from({ length: seatsPerRow }, (_, colIndex) => {
                  const seat = getSeatAt(rowIndex + 1, colIndex + 1);
                  const isUserSeat = seat?.id === student.id;

                  return (
                    <div
                      key={colIndex}
                      className={`flex-1 min-w-[50px] h-12 flex items-center justify-center text-xs font-medium rounded border transition-all ${
                        seat
                          ? isUserSeat
                            ? "bg-primary text-primary-foreground border-primary shadow-lg scale-110"
                            : "bg-card hover:bg-muted border-border"
                          : "bg-muted/30 border-dashed border-muted-foreground/20"
                      }`}
                      title={seat ? `${seat.student_name} - ${seat.registration_number}` : "Empty"}
                    >
                      {seat ? seat.seat_number : "-"}
                    </div>
                  );
                })}
              </div>
            ))}
          </div>
        </div>

        <div className="mt-6 flex items-center gap-6 text-sm">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-primary rounded border border-primary"></div>
            <span>Your Seat</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-card rounded border border-border"></div>
            <span>Occupied</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-muted/30 rounded border border-dashed border-muted-foreground/20"></div>
            <span>Empty</span>
          </div>
        </div>
      </Card>
    </div>
  );
};

export default SeatAllocationView;
