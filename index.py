import tkinter as tk
from tkinter import ttk, messagebox, filedialog
import json
import os

MOVE_TYPES = ["택시", "버스", "지하철", "블랙", "더블"]
MOVE_COLORS = {
    "택시": "#fffde7",
    "버스": "#a5d6a7",
    "지하철": "#ef9a9a",
    "블랙": "#616a6b",
    "더블": "#ce93d8"
}

DETECTIVE_COLORS = {
    0: {"bg": "#ffcdd2", "fg": "#c62828"},  # 빨간색
    1: {"bg": "#bbdefb", "fg": "#1565c0"},  # 파란색
    2: {"bg": "#fff9c4", "fg": "#f9a825"},  # 노란색
    3: {"bg": "#c8e6c9", "fg": "#2e7d32"},  # 초록색
    4: {"bg": "#e1bee7", "fg": "#6a1b9a"},  # 보라색
    5: {"bg": "#ffe0b2", "fg": "#e65100"}   # 주황색
}

SCALE_OPTIONS = [80, 100, 120, 150]

# 기본 데이터 구조
def get_default_state(num_detectives=3):
    return {
        "round": 1,
        "max_round": 24,
        "public_rounds": [3, 8, 13, 18, 24],
        "detectives": [
            {"이름": f"형사{i+1}", "위치": 1 + i*10, "택시": 10, "버스": 8, "지하철": 4}
            for i in range(num_detectives)
        ],
        "mr_x": {
            "이동내역": [],
            "위치": 42,
        }
    }

class ScotlandYardHelper(tk.Tk):
    def __init__(self):
        super().__init__()
        self.title("스코틀랜드 야드 현황판")
        self.base_width = 950
        self.base_height = 800
        self.font_size = tk.IntVar(value=14)
        self.font_family = "맑은고딕"
        self.scale = tk.IntVar(value=100)
        self.state = get_default_state()
        self.drag_data = {"move": None}
        self.create_widgets()

    def set_font(self):
        try:
            scaled_font = int(self.font_size.get() * self.scale.get() / 100)
            self.option_add("*Font", f"{self.font_family} {scaled_font}")
        except:
            pass

    def update_scale(self):
        w = int(self.base_width * self.scale.get() / 100)
        h = int(self.base_height * self.scale.get() / 100)
        self.geometry(f"{w}x{h}")
        self.set_font()
        self.create_detective_frames()
        self.draw_move_board()

    def create_widgets(self):
        # 폰트 크기/배율 조절
        topbar = ttk.Frame(self)
        topbar.pack(fill=tk.X, pady=5)
        ttk.Label(topbar, text="폰트 크기:").pack(side=tk.LEFT)
        font_spin = ttk.Spinbox(topbar, from_=10, to=24, width=3, textvariable=self.font_size, command=self.update_font)
        font_spin.pack(side=tk.LEFT, padx=5)
        ttk.Label(topbar, text="배율:").pack(side=tk.LEFT, padx=5)
        scale_combo = ttk.Combobox(topbar, values=[f"{s}%" for s in SCALE_OPTIONS], width=5, state="readonly", textvariable=tk.StringVar(value=f"{self.scale.get()}%"))
        scale_combo.pack(side=tk.LEFT, padx=2)
        scale_combo.bind("<<ComboboxSelected>>", self.on_scale_change)
        self.scale_combo = scale_combo
        ttk.Label(topbar, text="형사 수:").pack(side=tk.LEFT, padx=10)
        self.detective_count = tk.IntVar(value=len(self.state["detectives"]))
        spin = ttk.Spinbox(topbar, from_=2, to=6, width=3, textvariable=self.detective_count, command=self.update_detective_count)
        spin.pack(side=tk.LEFT, padx=5)

        # 라운드/공개라운드
        self.round_label = ttk.Label(topbar, text="")
        self.round_label.pack(side=tk.LEFT, padx=20)
        self.public_label = ttk.Label(topbar, text="")
        self.public_label.pack(side=tk.LEFT, padx=10)

        # 형사/미스터X 프레임
        self.info_frame = ttk.Frame(self)
        self.info_frame.pack(fill=tk.BOTH, expand=True, pady=10)
        self.detective_frames = []
        self.create_detective_frames()

        # 미스터X 정보
        self.mrx_frame = ttk.LabelFrame(self.info_frame, text="미스터 X 정보")
        self.mrx_frame.pack(fill=tk.X, pady=10)
        self.mrx_loc_var = tk.IntVar(value=self.state["mr_x"]["위치"])
        ttk.Label(self.mrx_frame, text="위치:").pack(side=tk.LEFT)
        self.mrx_loc_entry = ttk.Entry(self.mrx_frame, width=5, textvariable=self.mrx_loc_var)
        self.mrx_loc_entry.pack(side=tk.LEFT, padx=5)
        ttk.Button(self.mrx_frame, text="위치 수정", command=self.update_mrx_loc).pack(side=tk.LEFT, padx=5)

        # --- 미스터X 이동 현황판 (드래그앤드롭) ---
        self.moves_frame = ttk.LabelFrame(self, text="미스터 X 이동 현황판 (드래그 앤 드롭)")
        self.moves_frame.pack(fill=tk.X, pady=10)
        self.create_move_board()

        # 라운드/초기화/저장/불러오기 버튼
        btn_frame = ttk.Frame(self)
        btn_frame.pack(pady=10)
        ttk.Button(btn_frame, text="◀️ 이전 라운드", command=self.prev_round).pack(side=tk.LEFT, padx=5)
        ttk.Button(btn_frame, text="▶️ 다음 라운드", command=self.next_round).pack(side=tk.LEFT, padx=5)
        ttk.Button(btn_frame, text="🔄 초기화", command=self.reset_state).pack(side=tk.LEFT, padx=5)
        ttk.Button(btn_frame, text="💾 저장", command=self.save_state).pack(side=tk.LEFT, padx=5)
        ttk.Button(btn_frame, text="📂 불러오기", command=self.load_state).pack(side=tk.LEFT, padx=5)

        self.update_labels()
        self.set_font()
        self.update_scale()

    def on_scale_change(self, event):
        val = self.scale_combo.get().replace('%','')
        try:
            self.scale.set(int(val))
            self.update_scale()
        except:
            pass

    def update_font(self):
        self.set_font()
        self.draw_move_board()

    def font_tuple(self, delta=0):
        size = max(8, int(self.font_size.get() * self.scale.get() / 100) + delta)
        return (self.font_family, size)

    def create_detective_frames(self):
        for f in self.detective_frames:
            f.destroy()
        self.detective_frames = []
        scale = self.scale.get() / 100
        label_w = int(6 * scale)
        entry_w = int(5 * scale)
        btn_padx = int(5 * scale)
        btn_pady = int(2 * scale)
        
        for idx, d in enumerate(self.state["detectives"]):
            colors = DETECTIVE_COLORS[idx]
            frame = ttk.LabelFrame(self.info_frame, text=f"{d['이름']} 정보")
            frame.pack(fill=tk.X, pady=int(3*scale))
            
            # 위치 입력
            loc_frame = ttk.Frame(frame)
            loc_frame.pack(side=tk.LEFT, padx=5)
            ttk.Label(loc_frame, text="위치:", font=self.font_tuple()).pack(side=tk.LEFT)
            loc_var = tk.IntVar(value=d["위치"])
            loc_entry = ttk.Entry(loc_frame, width=entry_w, font=self.font_tuple(), textvariable=loc_var)
            loc_entry.pack(side=tk.LEFT, padx=int(2*scale))
            
            # 이동수단 카운터
            for t in ["택시", "버스", "지하철"]:
                t_frame = ttk.Frame(frame)
                t_frame.pack(side=tk.LEFT, padx=10)
                ttk.Label(t_frame, text=f"{t}:", font=self.font_tuple()).pack()
                t_var = tk.IntVar(value=d[t])
                counter_frame = ttk.Frame(t_frame)
                counter_frame.pack()
                
                # 감소 버튼
                minus_btn = tk.Button(counter_frame, text="-", font=self.font_tuple(-2),
                                    command=lambda v=t_var: v.set(max(0, v.get()-1)),
                                    width=2, bg=colors["bg"], fg=colors["fg"])
                minus_btn.pack(side=tk.LEFT)
                
                # 현재 값
                tk.Label(counter_frame, textvariable=t_var, width=2, font=self.font_tuple(),
                        bg=colors["bg"], fg=colors["fg"]).pack(side=tk.LEFT, padx=2)
                
                # 증가 버튼
                plus_btn = tk.Button(counter_frame, text="+", font=self.font_tuple(-2),
                                   command=lambda v=t_var: v.set(v.get()+1),
                                   width=2, bg=colors["bg"], fg=colors["fg"])
                plus_btn.pack(side=tk.LEFT)
                
                setattr(self, f"det_{idx}_{t}_var", t_var)
            
            # 수정 버튼
            update_btn = tk.Button(frame, text="수정", command=lambda i=idx, lv=loc_var: self.update_detective(i, lv),
                                width=int(6*scale), bg=colors["bg"], fg=colors["fg"],
                                font=self.font_tuple())
            update_btn.pack(side=tk.LEFT, padx=btn_padx, pady=btn_pady)
            
            self.detective_frames.append(frame)

    def create_move_board(self):
        # 이동수단 버튼
        btns_frame = ttk.Frame(self.moves_frame)
        btns_frame.pack(side=tk.LEFT, padx=10)
        ttk.Label(btns_frame, text="이동수단:").pack()
        for move in MOVE_TYPES:
            btn = tk.Label(btns_frame, text=move, bg=MOVE_COLORS[move], width=8, relief=tk.RAISED)
            btn.pack(pady=2)
            btn.bind("<ButtonPress-1>", lambda e, m=move: self.start_drag(e, m))
            btn.bind("<ButtonRelease-1>", self.end_drag)

        # 블랙/더블 티켓 현황 표시
        ticket_frame = ttk.Frame(self.moves_frame)
        ticket_frame.pack(side=tk.TOP, pady=2)
        
        # 블랙 티켓 카운터
        black_frame = ttk.Frame(ticket_frame)
        black_frame.pack(side=tk.LEFT, padx=10)
        black_used = sum(1 for m in self.state["mr_x"].get("이동내역", []) if m == "블랙")
        black_left = 5 - black_used
        ttk.Label(black_frame, text="블랙 티켓:", font=self.font_tuple()).pack()
        black_counter = ttk.Frame(black_frame)
        black_counter.pack()
        tk.Button(black_counter, text="-", command=lambda: self.adjust_special_ticket("블랙", -1),
                 width=2, font=self.font_tuple(-2)).pack(side=tk.LEFT)
        tk.Label(black_counter, text=str(black_left), width=2, font=self.font_tuple()).pack(side=tk.LEFT, padx=2)
        tk.Button(black_counter, text="+", command=lambda: self.adjust_special_ticket("블랙", 1),
                 width=2, font=self.font_tuple(-2)).pack(side=tk.LEFT)
        
        # 더블 티켓 카운터
        double_frame = ttk.Frame(ticket_frame)
        double_frame.pack(side=tk.LEFT, padx=10)
        double_used = sum(1 for m in self.state["mr_x"].get("이동내역", []) if m == "더블")
        double_left = 2 - double_used
        ttk.Label(double_frame, text="더블 티켓:", font=self.font_tuple()).pack()
        double_counter = ttk.Frame(double_frame)
        double_counter.pack()
        tk.Button(double_counter, text="-", command=lambda: self.adjust_special_ticket("더블", -1),
                 width=2, font=self.font_tuple(-2)).pack(side=tk.LEFT)
        tk.Label(double_counter, text=str(double_left), width=2, font=self.font_tuple()).pack(side=tk.LEFT, padx=2)
        tk.Button(double_counter, text="+", command=lambda: self.adjust_special_ticket("더블", 1),
                 width=2, font=self.font_tuple(-2)).pack(side=tk.LEFT)

        # 현황판(3행)
        self.board_canvas = tk.Canvas(self.moves_frame, width=self.get_board_width(), height=self.get_board_height(), bg="#f4f6f7", highlightthickness=1, highlightbackground="#bbb")
        self.board_canvas.pack(side=tk.LEFT, padx=10)
        self.move_rects = []
        self.draw_move_board()

    def get_board_width(self):
        return int(8 * 38 * self.scale.get() / 100) + 20
    def get_board_height(self):
        return int(3 * 60 * self.scale.get() / 100) + 20

    def draw_move_board(self):
        self.board_canvas.delete("all")
        self.move_rects = []
        scale = self.scale.get() / 100
        rect_w = int(34 * scale)
        rect_h = int(40 * scale)
        pad_x = int(4 * scale)
        pad_y = int(10 * scale)
        font_size = max(8, int(self.font_size.get() * scale) - 2)
        
        for i in range(self.state["max_round"]):
            row = i // 8
            col = i % 8
            x0 = 10 + col * (rect_w + pad_x)
            y0 = 10 + row * (rect_h + pad_y)
            x1 = x0 + rect_w
            y1 = y0 + rect_h
            
            # 공개 턴 표시
            is_public = (i+1) in self.state["public_rounds"]
            fill_color = "#e3f2fd" if is_public else "#fff"
            outline_color = "#1976d2" if is_public else "#888"
            outline_width = 2 if is_public else 1
            
            rect = self.board_canvas.create_rectangle(x0, y0, x1, y1,
                                                    fill=fill_color,
                                                    outline=outline_color,
                                                    width=outline_width)
            
            # 이동내역 표시
            move = self.state["mr_x"]["이동내역"][i] if i < len(self.state["mr_x"]["이동내역"]) else ""
            if move:  # 이동수단이 있는 경우에만 색상 적용
                color = MOVE_COLORS.get(move, "#fff")
                self.board_canvas.itemconfig(rect, fill=color)
            
            # 라운드 번호
            font_color = "#1976d2" if is_public else "#222"
            self.board_canvas.create_text((x0+x1)//2, (y0+y1)//2, text=move,
                                        font=(self.font_family, font_size),
                                        fill=font_color)
            self.board_canvas.create_text((x0+x1)//2, y1+10,
                                        text=str(i+1),
                                        font=(self.font_family, font_size),
                                        fill="#888")
            
            self.move_rects.append((rect, (x0, y0, x1, y1)))

        self.board_canvas.config(width=self.get_board_width(), height=self.get_board_height())
        self.board_canvas.bind("<ButtonRelease-1>", self.drop_on_board)

    def start_drag(self, event, move):
        # 블랙/더블 티켓 사용 제한
        if move == "블랙":
            black_used = sum(1 for m in self.state["mr_x"].get("이동내역", []) if m == "블랙")
            if black_used >= 5:
                messagebox.showwarning("블랙 티켓 소진", "블랙 티켓은 최대 5회까지만 사용할 수 있습니다.")
                self.drag_data["move"] = None
                return
        if move == "더블":
            double_used = sum(1 for m in self.state["mr_x"].get("이동내역", []) if m == "더블")
            if double_used >= 2:
                messagebox.showwarning("더블 티켓 소진", "더블 티켓은 최대 2회까지만 사용할 수 있습니다.")
                self.drag_data["move"] = None
                return
        self.drag_data["move"] = move

    def end_drag(self, event):
        pass

    def drop_on_board(self, event):
        if self.drag_data["move"] is None:
            return
        x, y = event.x, event.y
        for i, (rect, (x0, y0, x1, y1)) in enumerate(self.move_rects):
            if x0 <= x <= x1 and y0 <= y <= y1:
                # 블랙/더블 티켓 사용 제한 (라운드별로 중복 방지)
                move = self.drag_data["move"]
                이동내역 = self.state["mr_x"].get("이동내역", [])
                # 현재까지 사용된 개수(자기 자신 제외)
                used = sum(1 for idx, m in enumerate(이동내역) if m == move and idx != i)
                max_allowed = 5 if move == "블랙" else 2 if move == "더블" else 999
                if move in ["블랙", "더블"] and used >= max_allowed:
                    messagebox.showwarning(f"{move} 티켓 소진", f"{move} 티켓은 최대 {max_allowed}회까지만 사용할 수 있습니다.")
                    self.drag_data["move"] = None
                    return
                while len(self.state["mr_x"]["이동내역"]) <= i:
                    self.state["mr_x"]["이동내역"].append("")
                self.state["mr_x"]["이동내역"][i] = move
                self.draw_move_board()
                self.drag_data["move"] = None
                return

    def update_detective(self, idx, loc_var):
        try:
            self.state["detectives"][idx]["위치"] = int(loc_var.get())
            for t in ["택시", "버스", "지하철"]:
                self.state["detectives"][idx][t] = int(getattr(self, f"det_{idx}_{t}_var").get())
            self.update_labels()
        except Exception:
            messagebox.showerror("오류", "숫자를 올바르게 입력하세요.")

    def update_detective_count(self):
        n = self.detective_count.get()
        cur = len(self.state["detectives"])
        if n > cur:
            for i in range(cur, n):
                self.state["detectives"].append({"이름": f"형사{i+1}", "위치": 1 + i*10, "택시": 10, "버스": 8, "지하철": 4})
        elif n < cur:
            self.state["detectives"] = self.state["detectives"][:n]
        self.create_detective_frames()
        self.update_labels()

    def update_mrx_loc(self):
        try:
            self.state["mr_x"]["위치"] = int(self.mrx_loc_var.get())
            self.update_labels()
        except Exception:
            messagebox.showerror("오류", "숫자를 올바르게 입력하세요.")

    def next_round(self):
        if self.state["round"] < self.state["max_round"]:
            self.state["round"] += 1
            self.update_labels()

    def prev_round(self):
        if self.state["round"] > 1:
            self.state["round"] -= 1
            self.update_labels()

    def reset_state(self):
        n = self.detective_count.get()
        self.state = get_default_state(n)
        self.create_detective_frames()
        self.mrx_loc_var.set(self.state["mr_x"]["위치"])
        self.draw_move_board()
        self.update_labels()

    def save_state(self):
        file = filedialog.asksaveasfilename(defaultextension=".json", filetypes=[("JSON files", "*.json")])
        if file:
            with open(file, "w", encoding="utf-8") as f:
                json.dump(self.state, f, ensure_ascii=False, indent=2)
            messagebox.showinfo("저장 완료", "게임 상태가 저장되었습니다.")

    def load_state(self):
        file = filedialog.askopenfilename(filetypes=[("JSON files", "*.json")])
        if file:
            try:
                with open(file, "r", encoding="utf-8") as f:
                    loaded = json.load(f)
                if all(k in loaded for k in ["round", "max_round", "public_rounds", "detectives", "mr_x"]):
                    self.state = loaded
                    self.detective_count.set(len(self.state["detectives"]))
                    self.create_detective_frames()
                    self.mrx_loc_var.set(self.state["mr_x"]["위치"])
                    self.draw_move_board()
                    self.update_labels()
                    messagebox.showinfo("불러오기 완료", "게임 상태를 불러왔습니다.")
                else:
                    messagebox.showerror("오류", "유효하지 않은 게임 상태 파일입니다.")
            except Exception as e:
                messagebox.showerror("오류", f"불러오기 실패: {e}")

    def update_labels(self):
        self.round_label.config(text=f"라운드: {self.state['round']} / {self.state['max_round']}")
        if self.state["round"] in self.state["public_rounds"]:
            self.public_label.config(text=f"미스터 X 위치 공개: {self.state['mr_x']['위치']}", foreground='blue')
        else:
            self.public_label.config(text="미스터 X 위치 비공개", foreground='gray')
        self.draw_move_board()

    def adjust_special_ticket(self, ticket_type, delta):
        이동내역 = self.state["mr_x"].get("이동내역", [])
        used = sum(1 for m in 이동내역 if m == ticket_type)
        max_allowed = 5 if ticket_type == "블랙" else 2
        
        if delta > 0 and used >= max_allowed:
            messagebox.showwarning(f"{ticket_type} 티켓 소진", f"{ticket_type} 티켓은 최대 {max_allowed}회까지만 사용할 수 있습니다.")
            return
        
        # 티켓 사용 내역에서 해당 티켓을 찾아 제거하거나 추가
        if delta < 0 and used > 0:
            # 가장 최근에 사용된 해당 티켓을 찾아 제거
            for i in range(len(이동내역)-1, -1, -1):
                if 이동내역[i] == ticket_type:
                    이동내역[i] = ""
                    break
        elif delta > 0 and used < max_allowed:
            # 빈 칸을 찾아 티켓 추가
            for i in range(len(이동내역)):
                if 이동내역[i] == "":
                    이동내역[i] = ticket_type
                    break
            else:
                if len(이동내역) < self.state["max_round"]:
                    이동내역.append(ticket_type)
        
        self.draw_move_board()

if __name__ == "__main__":
    app = ScotlandYardHelper()
    app.mainloop() 
