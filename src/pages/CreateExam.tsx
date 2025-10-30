import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { toast } from "sonner";
import { ArrowLeft, Upload } from "lucide-react";
import { z } from "zod";

const examSchema = z.object({
  examName: z.string().min(3, "Exam name must be at least 3 characters"),
  examCode: z.string().min(3, "Exam code must be at least 3 characters"),
  totalStudents: z.number().min(1, "Total students must be at least 1"),
  numberOfHalls: z.number().min(1, "Number of halls must be at least 1"),
  studentsPerHall: z.number().min(1, "Students per hall must be at least 1"),
});

const CreateExam = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [studentFile, setStudentFile] = useState<File | null>(null);
  const [hallNames, setHallNames] = useState<string[]>([]);
  const [formData, setFormData] = useState({
    examName: "",
    examCode: "",
    totalStudents: 0,
    numberOfHalls: 0,
    studentsPerHall: 0,
  });

  const handleNumberOfHallsChange = (value: number) => {
    setFormData({ ...formData, numberOfHalls: value });
    setHallNames(Array(value).fill(""));
  };

  const handleHallNameChange = (index: number, name: string) => {
    const newNames = [...hallNames];
    newNames[index] = name;
    setHallNames(newNames);
  };

  const parseStudentFile = async (file: File): Promise<any[]> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const text = e.target?.result as string;
          const lines = text.split("\n").filter((line) => line.trim());
          const students = lines.slice(1).map((line) => {
            const [name, regNumber] = line.split(",").map((s) => s.trim());
            return { name, registration_number: regNumber };
          });
          resolve(students);
        } catch (error) {
          reject(error);
        }
      };
      reader.onerror = reject;
      reader.readAsText(file);
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const validatedData = examSchema.parse({
        ...formData,
        totalStudents: Number(formData.totalStudents),
        numberOfHalls: Number(formData.numberOfHalls),
        studentsPerHall: Number(formData.studentsPerHall),
      });

      if (!studentFile) {
        toast.error("Please upload a student list file");
        setLoading(false);
        return;
      }

      const students = await parseStudentFile(studentFile);

      if (students.length !== validatedData.totalStudents) {
        toast.error(
          `Student count mismatch. Expected ${validatedData.totalStudents}, got ${students.length}`
        );
        setLoading(false);
        return;
      }

      // Create exam
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const { data: exam, error: examError } = await supabase
        .from("exams")
        .insert({
          exam_code: validatedData.examCode,
          exam_name: validatedData.examName,
          total_students: validatedData.totalStudents,
          number_of_halls: validatedData.numberOfHalls,
          students_per_hall: validatedData.studentsPerHall,
          created_by: user.id,
          status: "published",
        })
        .select()
        .single();

      if (examError) throw examError;

      // Create halls
      const hallsToInsert = hallNames.map((name, index) => ({
        exam_id: exam.id,
        hall_name: name || `Hall ${index + 1}`,
        capacity: validatedData.studentsPerHall,
      }));

      const { data: halls, error: hallsError } = await supabase
        .from("halls")
        .insert(hallsToInsert)
        .select();

      if (hallsError) throw hallsError;

      // Allocate students to halls
      const allocations = [];
      let studentIndex = 0;

      for (let hallIndex = 0; hallIndex < halls.length; hallIndex++) {
        const hall = halls[hallIndex];
        const studentsInHall = Math.min(
          validatedData.studentsPerHall,
          students.length - studentIndex
        );

        for (let seat = 1; seat <= studentsInHall; seat++) {
          const student = students[studentIndex];
          allocations.push({
            exam_id: exam.id,
            hall_id: hall.id,
            student_name: student.name,
            registration_number: student.registration_number,
            seat_number: seat,
            row_number: Math.ceil(seat / 10),
            column_number: ((seat - 1) % 10) + 1,
          });
          studentIndex++;
        }
      }

      const { error: allocationsError } = await supabase
        .from("seat_allocations")
        .insert(allocations);

      if (allocationsError) throw allocationsError;

      toast.success("Exam created successfully");
      navigate("/admin");
    } catch (error: any) {
      if (error instanceof z.ZodError) {
        toast.error(error.errors[0].message);
      } else {
        toast.error(error.message || "Failed to create exam");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-secondary/20 to-background">
      <div className="container mx-auto px-4 py-8">
        <Button variant="ghost" onClick={() => navigate("/admin")} className="mb-6">
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Dashboard
        </Button>

        <Card className="max-w-2xl mx-auto p-8">
          <h1 className="text-3xl font-bold mb-6">Create New Exam</h1>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="examName">Exam Name</Label>
                <Input
                  id="examName"
                  placeholder="Mid-Semester Exam"
                  value={formData.examName}
                  onChange={(e) =>
                    setFormData({ ...formData, examName: e.target.value })
                  }
                  required
                />
              </div>

              <div>
                <Label htmlFor="examCode">Exam Code</Label>
                <Input
                  id="examCode"
                  placeholder="EXM1025"
                  value={formData.examCode}
                  onChange={(e) =>
                    setFormData({ ...formData, examCode: e.target.value })
                  }
                  required
                />
              </div>
            </div>

            <div className="grid md:grid-cols-3 gap-4">
              <div>
                <Label htmlFor="totalStudents">Total Students</Label>
                <Input
                  id="totalStudents"
                  type="number"
                  min="1"
                  value={formData.totalStudents || ""}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      totalStudents: parseInt(e.target.value) || 0,
                    })
                  }
                  required
                />
              </div>

              <div>
                <Label htmlFor="numberOfHalls">Number of Halls</Label>
                <Input
                  id="numberOfHalls"
                  type="number"
                  min="1"
                  value={formData.numberOfHalls || ""}
                  onChange={(e) =>
                    handleNumberOfHallsChange(parseInt(e.target.value) || 0)
                  }
                  required
                />
              </div>

              <div>
                <Label htmlFor="studentsPerHall">Students Per Hall</Label>
                <Input
                  id="studentsPerHall"
                  type="number"
                  min="1"
                  value={formData.studentsPerHall || ""}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      studentsPerHall: parseInt(e.target.value) || 0,
                    })
                  }
                  required
                />
              </div>
            </div>

            <div>
              <Label htmlFor="studentFile">Upload Student List (CSV)</Label>
              <div className="mt-2">
                <Input
                  id="studentFile"
                  type="file"
                  accept=".csv"
                  onChange={(e) => setStudentFile(e.target.files?.[0] || null)}
                  required
                />
                <p className="text-xs text-muted-foreground mt-2">
                  CSV format: Name, Registration Number (one per line with header)
                </p>
              </div>
            </div>

            {formData.numberOfHalls > 0 && (
              <div>
                <Label>Hall Names</Label>
                <div className="grid md:grid-cols-2 gap-4 mt-2">
                  {hallNames.map((name, index) => (
                    <Input
                      key={index}
                      placeholder={`Hall ${index + 1}`}
                      value={name}
                      onChange={(e) => handleHallNameChange(index, e.target.value)}
                    />
                  ))}
                </div>
              </div>
            )}

            <Button type="submit" className="w-full" size="lg" disabled={loading}>
              {loading ? "Creating..." : "Create Exam & Allocate Seats"}
            </Button>
          </form>
        </Card>
      </div>
    </div>
  );
};

export default CreateExam;
