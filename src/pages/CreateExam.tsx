import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import { ArrowLeft, Upload, Trash2 } from "lucide-react";
import { z } from "zod";

const examSchema = z.object({
  examName: z.string().min(3, "Exam name must be at least 3 characters"),
  examCode: z.string().min(3, "Exam code must be at least 3 characters"),
  numberOfHalls: z.number().min(1, "Number of halls must be at least 1"),
  benchRows: z.number().min(1, "Rows must be at least 1"),
  benchColumns: z.number().min(1, "Columns must be at least 1"),
  numberOfSubjects: z.number().min(1, "At least 1 subject required"),
  numberOfDepartments: z.number().min(1, "At least 1 department required"),
});

interface Subject {
  name: string;
  code: string;
}

interface Department {
  name: string;
  file: File | null;
  students: any[];
}

const CreateExam = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [hallNames, setHallNames] = useState<string[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([{ name: "", code: "" }]);
  const [departments, setDepartments] = useState<Department[]>([{ name: "", file: null, students: [] }]);
  const [useSharedSeating, setUseSharedSeating] = useState(true);
  const [formData, setFormData] = useState({
    examName: "",
    examCode: "",
    numberOfHalls: 0,
    benchRows: 0,
    benchColumns: 0,
    numberOfSubjects: 1,
    numberOfDepartments: 1,
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

  const handleNumberOfSubjectsChange = (value: number) => {
    setFormData({ ...formData, numberOfSubjects: value });
    const newSubjects = Array(value).fill(null).map((_, i) => subjects[i] || { name: "", code: "" });
    setSubjects(newSubjects);
  };

  const handleSubjectChange = (index: number, field: keyof Subject, value: string) => {
    const newSubjects = [...subjects];
    newSubjects[index] = { ...newSubjects[index], [field]: value };
    setSubjects(newSubjects);
  };

  const handleNumberOfDepartmentsChange = (value: number) => {
    setFormData({ ...formData, numberOfDepartments: value });
    const newDepts = Array(value).fill(null).map((_, i) => departments[i] || { name: "", file: null, students: [] });
    setDepartments(newDepts);
  };

  const handleDepartmentChange = (index: number, field: keyof Department, value: any) => {
    const newDepts = [...departments];
    newDepts[index] = { ...newDepts[index], [field]: value };
    setDepartments(newDepts);
  };

  const parseStudentFile = async (file: File, deptName: string): Promise<any[]> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const text = e.target?.result as string;
          if (!text || text.trim() === "") {
            reject(new Error("File is empty"));
            return;
          }

          const lines = text.split(/\r?\n/).filter((line) => line.trim());
          
          if (lines.length < 2) {
            reject(new Error("CSV must have header row and at least one student"));
            return;
          }

          const students = [];
          for (let i = 1; i < lines.length; i++) {
            const line = lines[i].trim();
            if (!line) continue;

            const parts = line.split(",").map((s) => s.trim());
            
            if (parts.length >= 2 && parts[0] && parts[1]) {
              students.push({
                name: parts[0],
                registration_number: parts[1],
                department: deptName
              });
            }
          }

          if (students.length === 0) {
            reject(new Error("No valid student data found in CSV"));
            return;
          }

          console.log(`Successfully parsed ${students.length} students from ${deptName}:`, students);
          resolve(students);
        } catch (error) {
          console.error("CSV parsing error:", error);
          reject(error);
        }
      };
      reader.onerror = () => reject(new Error("Failed to read file"));
      reader.readAsText(file);
    });
  };

  const handleDepartmentFileUpload = async (index: number, file: File | null) => {
    if (!file) return;
    
    if (!departments[index].name) {
      toast.error("Please enter department name first");
      return;
    }

    try {
      const students = await parseStudentFile(file, departments[index].name);
      handleDepartmentChange(index, "students", students);
      handleDepartmentChange(index, "file", file);
      toast.success(`✓ Loaded ${students.length} students from ${departments[index].name}`);
    } catch (error: any) {
      console.error("File upload error:", error);
      toast.error(error.message || "Failed to parse CSV file. Ensure format is: Name, Registration Number");
    }
  };

  const allocateSeatsRoundRobin = (allStudents: any[], rows: number, cols: number, hallId: string, subjectId?: string) => {
    const totalSeats = rows * cols;
    const deptGroups: { [key: string]: any[] } = {};
    
    allStudents.forEach(student => {
      if (!deptGroups[student.department]) {
        deptGroups[student.department] = [];
      }
      deptGroups[student.department].push(student);
    });

    const deptNames = Object.keys(deptGroups);
    const allocations = [];
    let currentDeptIndex = 0;
    let deptPointers = Object.fromEntries(deptNames.map(dept => [dept, 0]));

    for (let row = 1; row <= rows; row++) {
      for (let col = 1; col <= cols; col++) {
        let assigned = false;
        let attempts = 0;
        
        while (!assigned && attempts < deptNames.length) {
          const currentDept = deptNames[currentDeptIndex];
          const students = deptGroups[currentDept];
          const pointer = deptPointers[currentDept];

          if (pointer < students.length) {
            const student = students[pointer];
            allocations.push({
              hall_id: hallId,
              student_name: student.name,
              registration_number: student.registration_number,
              department_name: student.department,
              seat_number: allocations.length + 1,
              row_number: row,
              column_number: col,
              subject_id: subjectId,
            });
            deptPointers[currentDept]++;
            assigned = true;
          }

          currentDeptIndex = (currentDeptIndex + 1) % deptNames.length;
          attempts++;
        }

        if (!assigned) break;
      }
    }

    return allocations;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const validatedData = examSchema.parse({
        ...formData,
        numberOfHalls: Number(formData.numberOfHalls),
        benchRows: Number(formData.benchRows),
        benchColumns: Number(formData.benchColumns),
        numberOfSubjects: Number(formData.numberOfSubjects),
        numberOfDepartments: Number(formData.numberOfDepartments),
      });

      // Validate departments have files and students
      const emptyDepts = departments.filter(d => !d.name || !d.file || !d.students || d.students.length === 0);
      if (emptyDepts.length > 0) {
        toast.error("Please provide names and valid CSV files for all departments");
        setLoading(false);
        return;
      }

      console.log("All departments validated:", departments.map(d => ({
        name: d.name,
        studentCount: d.students.length
      })));

      // Validate subjects
      if (subjects.some(s => !s.name)) {
        toast.error("Please provide names for all subjects");
        setLoading(false);
        return;
      }

      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      // Gather all students from all departments
      const allStudents = departments.flatMap(d => d.students);
      const totalSeats = validatedData.benchRows * validatedData.benchColumns * validatedData.numberOfHalls;

      console.log(`Total students: ${allStudents.length}, Total seats: ${totalSeats}`);

      if (allStudents.length > totalSeats) {
        toast.error(`Not enough seats! You have ${allStudents.length} students but only ${totalSeats} seats available.`);
        setLoading(false);
        return;
      }

      if (allStudents.length === 0) {
        toast.error("No students found in uploaded CSV files");
        setLoading(false);
        return;
      }

      // Create exam
      const { data: exam, error: examError } = await supabase
        .from("exams")
        .insert({
          exam_code: validatedData.examCode,
          exam_name: validatedData.examName,
          total_students: allStudents.length,
          number_of_halls: validatedData.numberOfHalls,
          students_per_hall: validatedData.benchRows * validatedData.benchColumns,
          bench_rows: validatedData.benchRows,
          bench_columns: validatedData.benchColumns,
          created_by: user.id,
          status: "published",
        })
        .select()
        .single();

      if (examError) throw examError;

      // Create or get departments
      const deptIds: { [name: string]: string } = {};
      for (const dept of departments) {
        const { data: existingDept } = await supabase
          .from("departments")
          .select("id")
          .eq("name", dept.name)
          .maybeSingle();

        if (existingDept) {
          deptIds[dept.name] = existingDept.id;
        } else {
          const { data: newDept, error } = await supabase
            .from("departments")
            .insert({ name: dept.name })
            .select()
            .single();
          if (error) throw error;
          deptIds[dept.name] = newDept.id;
        }

        await supabase.from("exam_departments").insert({
          exam_id: exam.id,
          department_id: deptIds[dept.name],
          student_count: dept.students.length,
        });
      }

      // Create subjects
      const { data: subjectsData, error: subjectsError } = await supabase
        .from("subjects")
        .insert(
          subjects.map(s => ({
            exam_id: exam.id,
            subject_name: s.name,
            subject_code: s.code,
            use_shared_seating: useSharedSeating,
          }))
        )
        .select();

      if (subjectsError) throw subjectsError;

      // Create halls
      const hallsToInsert = hallNames.map((name, index) => ({
        exam_id: exam.id,
        hall_name: name || `Hall ${index + 1}`,
        capacity: validatedData.benchRows * validatedData.benchColumns,
      }));

      const { data: halls, error: hallsError } = await supabase
        .from("halls")
        .insert(hallsToInsert)
        .select();

      if (hallsError) throw hallsError;

      // Allocate seats - use a working copy to avoid mutating original
      const allAllocations = [];
      const studentsToAllocate = [...allStudents];
      
      console.log(`Starting seat allocation for ${studentsToAllocate.length} students across ${halls.length} halls`);
      
      if (useSharedSeating) {
        // Same seating for all subjects
        for (const hall of halls) {
          const seatsInHall = validatedData.benchRows * validatedData.benchColumns;
          const studentsForHall = studentsToAllocate.splice(0, Math.min(seatsInHall, studentsToAllocate.length));
          
          const hallAllocations = allocateSeatsRoundRobin(
            studentsForHall,
            validatedData.benchRows,
            validatedData.benchColumns,
            hall.id
          );
          
          allAllocations.push(...hallAllocations.map(a => ({ ...a, exam_id: exam.id })));
          console.log(`Hall ${hall.hall_name}: allocated ${hallAllocations.length} students`);
        }
      } else {
        // Different seating per subject
        for (const subject of subjectsData) {
          const subjectStudents = [...allStudents];
          for (const hall of halls) {
            const seatsInHall = validatedData.benchRows * validatedData.benchColumns;
            const studentsForHall = subjectStudents.splice(0, Math.min(seatsInHall, subjectStudents.length));
            
            const hallAllocations = allocateSeatsRoundRobin(
              studentsForHall,
              validatedData.benchRows,
              validatedData.benchColumns,
              hall.id,
              subject.id
            );
            
            allAllocations.push(...hallAllocations.map(a => ({ ...a, exam_id: exam.id })));
            console.log(`Hall ${hall.hall_name}, Subject ${subject.subject_name}: allocated ${hallAllocations.length} students`);
          }
        }
      }

      console.log(`Total seat allocations created: ${allAllocations.length}`);

      const { error: allocationsError } = await supabase
        .from("seat_allocations")
        .insert(allAllocations);

      if (allocationsError) throw allocationsError;

      toast.success("Exam created successfully with smart seat allocation!");
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
                <Label htmlFor="numberOfSubjects">Number of Subjects</Label>
                <Input
                  id="numberOfSubjects"
                  type="number"
                  min="1"
                  value={formData.numberOfSubjects || ""}
                  onChange={(e) =>
                    handleNumberOfSubjectsChange(parseInt(e.target.value) || 1)
                  }
                  required
                />
              </div>

              <div>
                <Label htmlFor="numberOfDepartments">Number of Departments</Label>
                <Input
                  id="numberOfDepartments"
                  type="number"
                  min="1"
                  value={formData.numberOfDepartments || ""}
                  onChange={(e) =>
                    handleNumberOfDepartmentsChange(parseInt(e.target.value) || 1)
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
            </div>

            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="benchRows">Bench Rows</Label>
                <Input
                  id="benchRows"
                  type="number"
                  min="1"
                  value={formData.benchRows || ""}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      benchRows: parseInt(e.target.value) || 0,
                    })
                  }
                  required
                />
              </div>

              <div>
                <Label htmlFor="benchColumns">Bench Columns</Label>
                <Input
                  id="benchColumns"
                  type="number"
                  min="1"
                  value={formData.benchColumns || ""}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      benchColumns: parseInt(e.target.value) || 0,
                    })
                  }
                  required
                />
              </div>
            </div>

            {subjects.length > 0 && (
              <div>
                <Label>Subjects</Label>
                <div className="space-y-3 mt-2">
                  {subjects.map((subject, index) => (
                    <div key={index} className="grid md:grid-cols-2 gap-4">
                      <Input
                        placeholder={`Subject ${index + 1} Name`}
                        value={subject.name}
                        onChange={(e) => handleSubjectChange(index, "name", e.target.value)}
                        required
                      />
                      <Input
                        placeholder={`Subject ${index + 1} Code`}
                        value={subject.code}
                        onChange={(e) => handleSubjectChange(index, "code", e.target.value)}
                      />
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="flex items-center space-x-2">
              <Switch
                id="shared-seating"
                checked={useSharedSeating}
                onCheckedChange={setUseSharedSeating}
              />
              <Label htmlFor="shared-seating" className="cursor-pointer">
                Use same seating arrangement for all subjects
              </Label>
            </div>

            {departments.length > 0 && (
              <div>
                <Label>Departments & Student Lists</Label>
                <div className="space-y-4 mt-2">
                  {departments.map((dept, index) => (
                    <Card key={index} className="p-4">
                      <div className="space-y-3">
                        <Input
                          placeholder={`Department ${index + 1} Name (e.g., CSE, AIDS)`}
                          value={dept.name}
                          onChange={(e) => handleDepartmentChange(index, "name", e.target.value)}
                          required
                        />
                        <div>
                         <Input
                            type="file"
                            accept=".csv"
                            onChange={(e) => handleDepartmentFileUpload(index, e.target.files?.[0] || null)}
                            required
                            className={dept.students.length > 0 ? "border-green-500" : ""}
                          />
                          <p className={`text-xs mt-1 ${dept.students.length > 0 ? "text-green-600 font-medium" : "text-muted-foreground"}`}>
                            CSV Format: Name, Registration Number
                            {dept.students.length > 0 && ` | ✓ ${dept.students.length} students loaded`}
                            {dept.file && !dept.students.length && " | Processing..."}
                          </p>
                        </div>
                      </div>
                    </Card>
                  ))}
                </div>
              </div>
            )}

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
